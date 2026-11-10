// Inbound WhatsApp media: download from the provider, store in wa_media, serve through a signed URL.
// Server-only. Never throws (returns null on any failure so a bad attachment can't lose the message itself).

import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";

export const MAX_MEDIA_BYTES = 6 * 1024 * 1024;
const GRAPH = "https://graph.facebook.com/v21.0";

export type MediaKind = "image" | "audio" | "video" | "document" | "sticker";
export interface DownloadedMedia { data: Buffer; mime: string; filename?: string }

function secret(): string | null { return process.env.WA_CONFIG_KEY ?? process.env.AUTH_JWT_SECRET ?? null; }
export function mediaSig(id: string): string {
  const k = secret();
  return k ? createHmac("sha256", k).update(`wa-media:${id}`).digest("hex").slice(0, 32) : "";
}
export function verifyMediaSig(id: string, sig: string | null): boolean {
  const want = mediaSig(id);
  if (!want) return true; // no signing secret configured → unguessable uuid is the only protection (dev/demo)
  const a = Buffer.from(want), b = Buffer.from(sig ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Label used as the message text for a media message (also what the AI / drip engine "sees"). */
export function mediaLabel(kind: string, caption?: string): string {
  const base = kind === "audio" ? "[voice note]" : kind === "sticker" ? "[sticker]" : `[${kind}]`;
  return caption ? `${base} ${caption}` : base;
}

export async function saveInboundMedia(m: DownloadedMedia): Promise<string | null> {
  try {
    if (!m.data.length || m.data.length > MAX_MEDIA_BYTES) return null;
    const { data, error } = await getDb().from("wa_media").insert({ mime: m.mime || "application/octet-stream", filename: (m.filename ?? "").slice(0, 200), size: m.data.length, data_b64: m.data.toString("base64") }).select("id").single();
    if (error || !data) { console.error("[wa-media] save failed:", error?.message); return null; }
    const id = String(data.id), sig = mediaSig(id);
    return `/api/whatsapp/media/${id}${sig ? `?sig=${sig}` : ""}`;
  } catch (err) { console.error("[wa-media] save error:", err); return null; }
}

/** Meta Cloud API: media id → short-lived URL → bytes (both calls need the bearer token). */
export async function downloadCloudMedia(mediaId: string, env: NodeJS.ProcessEnv, filename?: string): Promise<DownloadedMedia | null> {
  const token = env.WHATSAPP_CLOUD_TOKEN;
  if (!token || !mediaId) return null;
  try {
    const meta = await fetch(`${GRAPH}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    if (!meta.ok) return null;
    const j = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!j.url || (j.file_size ?? 0) > MAX_MEDIA_BYTES) return null;
    const res = await fetch(j.url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    return { data: Buffer.from(await res.arrayBuffer()), mime: j.mime_type ?? res.headers.get("content-type") ?? "", filename };
  } catch (err) { console.error("[wa-media] cloud download failed:", err); return null; }
}

/** Twilio: MediaUrl0 needs Basic auth (account SID : auth token). */
export async function downloadTwilioMedia(url: string, mime: string): Promise<DownloadedMedia | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !tok || !/^https:\/\/api\.twilio\.com\//.test(url)) return null;
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString("base64")}` }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    return { data: Buffer.from(await res.arrayBuffer()), mime: mime || res.headers.get("content-type") || "" };
  } catch (err) { console.error("[wa-media] twilio download failed:", err); return null; }
}
