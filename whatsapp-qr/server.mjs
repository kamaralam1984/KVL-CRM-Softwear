// KVL CRM — WhatsApp QR service (linked-device, like WhatsApp Web).
// Standalone always-on Node process (VPS/PM2/Docker) — NOT for Vercel/serverless.
//
//   GET  /?key=SECRET        → HTML page: scan the QR with WhatsApp ▸ Linked devices
//   GET  /qr                 → { state, qr: <data-URL PNG | null>, ... }  (Bearer — used by CRM ▸ WhatsApp Setup)
//   GET  /status             → { state: "open"|"connecting"|"qr"|"closed", sentToday, ... }   (Bearer)
//   POST /send {to, body}    → queue a message (Bearer)  — human-like pacing + daily cap
//   POST /logout             → unlink the number (Bearer)
//   inbound messages         → POST <CRM_URL>/api/whatsapp/qr/inbound (Bearer)
//
// ⚠ Unofficial: WhatsApp can ban numbers that send bulk/unsolicited messages. The pacing and
// daily cap below reduce — not remove — that risk. Use a number you can afford to lose, or
// use the official Cloud API mode instead.

import http from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import pino from "pino";
import QRCode from "qrcode";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, downloadMediaMessage } from "@whiskeysockets/baileys";

const PORT = Number(process.env.WHATSAPP_QR_PORT || 4002);
const SECRET = process.env.WHATSAPP_QR_SECRET;
const CRM_URL = (process.env.CRM_URL || "").replace(/\/$/, "");
const AUTH_DIR = process.env.WHATSAPP_QR_AUTH_DIR || "./auth";
const DAILY_CAP = Number(process.env.WHATSAPP_QR_DAILY_CAP || 200);
const MIN_GAP_MS = Number(process.env.WHATSAPP_QR_MIN_GAP_MS || 4000);
const MAX_GAP_MS = Number(process.env.WHATSAPP_QR_MAX_GAP_MS || 9000);

// Warm-up: a freshly linked number that suddenly sends hundreds a day gets flagged. The cap ramps up with the
// days since first link (WHATSAPP_QR_WARMUP=off disables; the plain DAILY_CAP always applies as the ceiling).
const WARMUP = process.env.WHATSAPP_QR_WARMUP !== "off";
const META_FILE = `${AUTH_DIR}/kvl-meta.json`;
function loadMeta() { try { return JSON.parse(readFileSync(META_FILE, "utf8")); } catch { return {}; } }
function saveMeta(m) { try { mkdirSync(AUTH_DIR, { recursive: true }); writeFileSync(META_FILE, JSON.stringify(m)); } catch {} }
const meta = loadMeta();
function warmupCap() {
  if (!WARMUP || !meta.firstLinkedAt) return Infinity;
  const days = (Date.now() - meta.firstLinkedAt) / 86_400_000;
  return days < 2 ? 30 : days < 4 ? 60 : days < 7 ? 100 : days < 14 ? 150 : Infinity;
}
const effectiveCap = () => Math.min(DAILY_CAP, warmupCap());

if (!SECRET || SECRET.length < 16) {
  console.error("[wa-qr] Set WHATSAPP_QR_SECRET (min 16 chars). Exiting.");
  process.exit(1);
}

const log = pino({ level: process.env.LOG_LEVEL || "info" });
const state = { conn: "connecting", qr: null, me: null, sentToday: 0, day: new Date().toDateString() };
let sock = null;

const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const authed = (req, url) => same(req.headers.authorization || "", `Bearer ${SECRET}`) || same(url.searchParams.get("key") || "", SECRET);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function forwardInbound(from, body, id, media) {
  if (!CRM_URL) return log.warn("CRM_URL not set — inbound message not forwarded");
  try {
    const res = await fetch(`${CRM_URL}/api/whatsapp/qr/inbound`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, body, id, media }),
    });
    if (!res.ok) log.error({ status: res.status }, "CRM rejected inbound message");
  } catch (err) { log.error({ err: String(err) }, "forwarding inbound failed"); }
}

// Delivery / read receipts for messages WE sent → CRM (so broadcast reports show delivered / read in QR mode too).
async function forwardStatus(id, status) {
  if (!CRM_URL || !id) return;
  try {
    await fetch(`${CRM_URL}/api/whatsapp/qr/inbound`, { method: "POST", headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: "status", id, status }) });
  } catch (err) { log.error({ err: String(err) }, "forwarding status failed"); }
}
// Connection health → CRM (in-app alert). "closed" is debounced so a quick auto-reconnect doesn't page anyone.
let closedTimer = null, alerted = false;
async function forwardState(st, reason = "") {
  if (!CRM_URL) return;
  try {
    await fetch(`${CRM_URL}/api/whatsapp/qr/inbound`, { method: "POST", headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: "state", state: st, reason }) });
  } catch (err) { log.error({ err: String(err) }, "forwarding state failed"); }
}
function onConnectionState(st, reason = "") {
  clearTimeout(closedTimer);
  if (st === "open") { if (alerted) { alerted = false; forwardState("open"); } return; }
  const fire = () => { alerted = true; forwardState(st, reason); };
  if (st === "logged_out") fire(); else closedTimer = setTimeout(fire, 90_000);
}
const MAX_MEDIA = 6 * 1024 * 1024;

async function start() {
  const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({ auth, version, browser: Browsers.macOS("Desktop"), logger: pino({ level: "silent" }), markOnlineOnConnect: false, syncFullHistory: false });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) { state.qr = qr; state.conn = "qr"; log.info("QR ready — open /?key=… and scan"); }
    if (connection === "open") {
      state.conn = "open"; state.qr = null; state.me = sock.user?.id ?? null; log.info({ me: state.me }, "WhatsApp connected");
      if (!meta.firstLinkedAt) { meta.firstLinkedAt = Date.now(); saveMeta(meta); }
      onConnectionState("open");
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      state.conn = "closed";
      if (code === DisconnectReason.loggedOut) { log.warn("Logged out — delete ./auth and restart to re-link"); onConnectionState("logged_out", "WhatsApp logged this device out — re-scan the QR"); return; }
      onConnectionState("closed", `connection lost (code ${code ?? "?"})`);
      log.warn({ code }, "connection closed — reconnecting in 5s");
      setTimeout(start, 5000);
    }
  });

  // Baileys status: 3 = DELIVERY_ACK, 4 = READ, 5 = PLAYED, 0 = ERROR
  sock.ev.on("messages.update", (updates) => {
    for (const u of updates) {
      if (!u.key?.fromMe) continue;
      const st = u.update?.status;
      const mapped = st === 3 ? "delivered" : st === 4 || st === 5 ? "read" : st === 0 ? "failed" : null;
      if (mapped) forwardStatus(u.key.id, mapped);
    }
  });

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) {
      if (m.key.fromMe || !m.message) continue;
      const jid = m.key.remoteJidAlt || m.key.participantPn || m.key.remoteJid || "";
      if (!jid.endsWith("@s.whatsapp.net")) continue; // skip groups/broadcasts/unresolvable @lid
      const msg = m.message;
      const body = msg.conversation || msg.extendedTextMessage?.text || msg.buttonsResponseMessage?.selectedDisplayText || msg.listResponseMessage?.title
        || (msg.imageMessage ? "[image]" : msg.audioMessage ? "[voice note]" : msg.documentMessage ? "[document]" : msg.videoMessage ? "[video]" : "[message]");
      const kind = msg.imageMessage ? "image" : msg.audioMessage ? "audio" : msg.videoMessage ? "video" : msg.documentMessage ? "document" : msg.stickerMessage ? "sticker" : null;
      const caption = msg.imageMessage?.caption || msg.videoMessage?.caption || msg.documentMessage?.caption || "";
      (async () => {
        let media;
        if (kind) {
          try {
            const buf = await downloadMediaMessage(m, "buffer", {});
            if (buf?.length && buf.length <= MAX_MEDIA) {
              const inner = msg[`${kind}Message`];
              media = { kind, mime: inner?.mimetype || "", filename: inner?.fileName || "", b64: buf.toString("base64") };
            }
          } catch (err) { log.warn({ err: String(err) }, "media download failed — forwarding text only"); }
        }
        forwardInbound(jid.split("@")[0], media ? caption : body, m.key.id, media);
      })();
    }
  });
}

// ── Paced send queue ─────────────────────────────────────────────────────────
let chain = Promise.resolve();
function enqueueSend(to, body, mediaUrl, mediaKind) {
  const job = chain.then(async () => {
    const today = new Date().toDateString();
    if (state.day !== today) { state.day = today; state.sentToday = 0; }
    if (state.conn !== "open") throw new Error(`WhatsApp not connected (${state.conn})`);
    const cap = effectiveCap();
    if (state.sentToday >= cap) throw new Error(`Daily cap of ${cap} reached${cap < DAILY_CAP ? " (number warm-up limit)" : ""}`);
    const [hit] = (await sock.onWhatsApp(to)) || [];
    if (!hit?.exists) throw new Error("Number is not on WhatsApp");
    const content = !mediaUrl ? { text: body }
      : mediaKind === "image" ? { image: { url: mediaUrl }, caption: body }
      : mediaKind === "video" ? { video: { url: mediaUrl }, caption: body }
      : { document: { url: mediaUrl }, caption: body, fileName: decodeURIComponent(mediaUrl.split("?")[0].split("/").pop() || "file"), mimetype: "application/octet-stream" };
    // Look human: "typing…" for a moment proportional to the message length before it lands.
    try {
      await sock.presenceSubscribe(hit.jid);
      await sock.sendPresenceUpdate("composing", hit.jid);
      await sleep(Math.min(5000, 700 + (body?.length || 20) * 35 + Math.random() * 900));
      await sock.sendPresenceUpdate("paused", hit.jid);
    } catch { /* presence is cosmetic — never block the send */ }
    const res = await sock.sendMessage(hit.jid, content);
    state.sentToday++;
    await sleep(MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS));
    return res?.key?.id;
  });
  chain = job.catch(() => {});
  return job;
}

// ── HTTP ─────────────────────────────────────────────────────────────────────
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
const readJson = (req) => new Promise((resolve, reject) => {
  let d = ""; req.on("data", (c) => { d += c; if (d.length > 100_000) reject(new Error("too large")); });
  req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch (e) { reject(e); } });
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (!authed(req, url)) return json(res, 401, { ok: false, error: "unauthorized" });

    if (req.method === "GET" && url.pathname === "/") {
      const img = state.qr ? await QRCode.toDataURL(state.qr, { width: 320, margin: 1 }) : null;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta http-equiv=refresh content=5>
<title>WhatsApp link</title><body style="font-family:system-ui;background:#0d1420;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center">
<div><h2>KVL WhatsApp</h2>${state.conn === "open"
  ? `<p style="color:#34d399">✅ Connected as ${state.me?.split(":")[0] ?? "your number"}</p><p>Sent today: ${state.sentToday}/${effectiveCap()}</p>`
  : img ? `<img src="${img}" width=320 height=320 style="background:#fff;padding:8px;border-radius:12px"><p>WhatsApp ▸ Settings ▸ Linked devices ▸ Link a device</p>`
  : `<p>Status: ${state.conn}… (page refreshes automatically)</p>`}</div></body>`);
    }
    if (req.method === "GET" && url.pathname === "/qr") {
      const qr = state.qr ? await QRCode.toDataURL(state.qr, { width: 280, margin: 1 }) : null;
      return json(res, 200, { ok: true, state: state.conn, me: state.me, qr, sentToday: state.sentToday, dailyCap: effectiveCap() });
    }
    if (req.method === "GET" && url.pathname === "/status") {
      const w = warmupCap();
      return json(res, 200, { ok: true, state: state.conn, me: state.me, sentToday: state.sentToday, dailyCap: effectiveCap(), maxCap: DAILY_CAP, warmup: Number.isFinite(w) && w < DAILY_CAP, linkedDays: meta.firstLinkedAt ? Math.floor((Date.now() - meta.firstLinkedAt) / 86_400_000) : null });
    }

    if (req.method === "POST" && url.pathname === "/send") {
      const { to, body = "", mediaUrl, mediaKind } = await readJson(req);
      if (!/^\d{8,15}$/.test(String(to || "")) || typeof body !== "string" || (!body && !mediaUrl)) return json(res, 400, { ok: false, error: "need digits-only 'to' and 'body' (or mediaUrl)" });
      if (mediaUrl && !/^https:\/\//.test(String(mediaUrl))) return json(res, 400, { ok: false, error: "mediaUrl must be https" });
      try { return json(res, 200, { ok: true, id: await enqueueSend(to, body, mediaUrl, mediaKind) }); }
      catch (err) { return json(res, 502, { ok: false, error: String(err.message || err) }); }
    }
    if (req.method === "POST" && url.pathname === "/pair") {
      const { phone } = await readJson(req);
      const digits = String(phone || "").replace(/\D/g, "");
      if (!/^\d{8,15}$/.test(digits)) return json(res, 400, { ok: false, error: "phone must be 8-15 digits with country code, e.g. 919812345678" });
      if (state.conn === "open") return json(res, 409, { ok: false, error: "already linked" });
      if (!sock) return json(res, 503, { ok: false, error: "service starting, retry in a few seconds" });
      try {
        const raw = await sock.requestPairingCode(digits);
        return json(res, 200, { ok: true, code: String(raw).replace(/(.{4})(.{4})/, "$1-$2") });
      } catch (err) { return json(res, 502, { ok: false, error: `could not get a pairing code: ${String(err.message || err)}` }); }
    }
    if (req.method === "POST" && url.pathname === "/logout") { await sock?.logout().catch(() => {}); return json(res, 200, { ok: true }); }
    return json(res, 404, { ok: false, error: "not_found" });
  } catch (err) { log.error({ err: String(err) }, "request failed"); return json(res, 500, { ok: false, error: "internal_error" }); }
}).listen(PORT, () => log.info(`WhatsApp QR service on :${PORT}`));

start().catch((err) => { log.error({ err: String(err) }, "startup failed"); process.exit(1); });
