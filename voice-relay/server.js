// Phase 44 — Voice AI Live Audio Bridge. Standalone Node process (NOT part
// of the Next.js app) — bridges Twilio Media Streams <-> OpenAI's Realtime
// API so a placed call actually carries live AI audio, closing the gap
// lib/voice/providers.ts's initiateCall() header comment already documented
// ("live media/webhook relay required to complete").
//
// Deploy as its own isolated PM2 process (see docs/GHL_PARITY_STATUS.md's
// Phase 44 notes for the exact VPS commands) — runs from the SAME installed
// node_modules as the main app (only requires `ws` + `@supabase/supabase-js`,
// both already dependencies), just a different entry point/port, proxied by
// a NEW Nginx wss:// location block. Never touches any other site on the VPS.
//
// Audio format: both sides speak g711_ulaw (Twilio's native format, and one
// of OpenAI Realtime's supported formats) — this avoids hand-rolling PCM
// transcoding entirely; the base64 audio payload is forwarded as-is between
// the two JSON-over-WebSocket protocols, just re-wrapped in each side's own
// envelope shape.
//
// Gap-check fix — this WebSocket endpoint is NOT behind the Next.js app's
// auth/rate-limiting infrastructure at all (it's a bare standalone server),
// so it needs its own two-layer defense against an attacker who discovers
// or guesses the wss:// URL and opens a connection pretending to be Twilio,
// which would otherwise open a real, billed OpenAI Realtime session for
// free and could overwrite an arbitrary call_logs row by CallSid:
//   1. A shared-secret token in the connection URL's query string
//      (?token=...), checked with a constant-time compare, BEFORE anything
//      else happens on the connection.
//   2. The OpenAI Realtime session is not opened at connection time at
//      all — only after Twilio's "start" event arrives with a CallSid that
//      matches a real call_logs row this process itself (via
//      lib/voice/providers.ts::placeTwilioStreamCall) already created for
//      an actual outbound call. An unrecognized CallSid closes the
//      connection instead of ever touching OpenAI.

const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const PORT = process.env.VOICE_RELAY_PORT || 4001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17";
const VOICE_AI_INSTRUCTIONS =
  process.env.VOICE_AI_INSTRUCTIONS || "You are a helpful, concise phone assistant for a business. Keep responses short and natural.";
const SHARED_SECRET = process.env.VOICE_RELAY_SHARED_SECRET;

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("voice-relay ok");
});

const wss = new WebSocketServer({ server, path: "/voice-stream" });

wss.on("connection", (twilioWs, req) => {
  // Layer 1 — shared-secret token, checked before anything else.
  if (!SHARED_SECRET) {
    console.error("[voice-relay] VOICE_RELAY_SHARED_SECRET not set — refusing all connections");
    twilioWs.close(1008, "not_configured");
    return;
  }
  const url = new URL(req.url, "http://localhost");
  const token = url.searchParams.get("token") || "";
  if (!token || !timingSafeStringEqual(token, SHARED_SECRET)) {
    console.error("[voice-relay] connection rejected — invalid or missing token");
    twilioWs.close(1008, "unauthorized");
    return;
  }

  console.log("[voice-relay] Twilio media stream connected (token verified)");

  if (!OPENAI_API_KEY) {
    console.error("[voice-relay] OPENAI_API_KEY not set — closing connection");
    twilioWs.close();
    return;
  }

  const db = supabase();
  let streamSid = null;
  let callSid = null;
  let transcript = "";
  let finalized = false;
  let openaiWs = null;
  let closedBeforeValidated = false;

  // Layer 2 — the OpenAI session only opens once Twilio's "start" event
  // gives us a callSid that matches a real, expected call this process
  // itself initiated (via lib/voice/providers.ts). Everything before that
  // point cannot reach OpenAI no matter what a connected client sends.
  async function openOpenAiSession() {
    if (!db) {
      console.error("[voice-relay] Supabase not configured — cannot validate callSid, refusing to bridge");
      twilioWs.close(1008, "not_configured");
      return;
    }
    const { data, error } = await db
      .from("call_logs")
      .select("id")
      .eq("provider_call_sid", callSid)
      .eq("is_ai_call", true)
      .maybeSingle();
    if (error || !data) {
      console.error(`[voice-relay] unrecognized callSid "${callSid}" — refusing to open an OpenAI session`);
      twilioWs.close(1008, "unrecognized_call");
      return;
    }
    if (closedBeforeValidated) return; // Twilio already hung up while we were checking

    openaiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(OPENAI_REALTIME_MODEL)}`, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "realtime=v1" },
    });

    openaiWs.on("open", () => {
      openaiWs.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            instructions: VOICE_AI_INSTRUCTIONS,
            input_audio_format: "g711_ulaw",
            output_audio_format: "g711_ulaw",
            voice: "alloy",
            input_audio_transcription: { model: "whisper-1" },
          },
        }),
      );
    });

    openaiWs.on("message", (raw) => {
      let event;
      try {
        event = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (event.type === "response.audio.delta" && event.delta && streamSid && twilioWs.readyState === WebSocket.OPEN) {
        twilioWs.send(JSON.stringify({ event: "media", streamSid, media: { payload: event.delta } }));
      }
      if (event.type === "response.audio_transcript.done" && event.transcript) {
        transcript += `AI: ${event.transcript}\n`;
      }
      if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
        transcript += `Caller: ${event.transcript}\n`;
      }
      if (event.type === "error") {
        console.error("[voice-relay] OpenAI Realtime error:", JSON.stringify(event.error));
      }
    });

    openaiWs.on("error", (err) => console.error("[voice-relay] OpenAI ws error:", err.message));
    openaiWs.on("close", () => {
      try {
        twilioWs.close();
      } catch {
        /* already closed */
      }
    });
  }

  twilioWs.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.event === "start") {
      streamSid = msg.start?.streamSid ?? null;
      callSid = msg.start?.callSid ?? null;
      console.log(`[voice-relay] call started sid=${callSid} stream=${streamSid}`);
      if (callSid) openOpenAiSession().catch((err) => console.error("[voice-relay] openOpenAiSession failed:", err.message));
    } else if (msg.event === "media" && openaiWs && openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(JSON.stringify({ type: "input_audio_buffer.append", audio: msg.media.payload }));
    } else if (msg.event === "stop") {
      console.log(`[voice-relay] call stopped sid=${callSid}`);
      finalize();
    }
  });

  twilioWs.on("close", () => {
    closedBeforeValidated = true;
    try {
      if (openaiWs) openaiWs.close();
    } catch {
      /* already closed */
    }
    finalize();
  });
  twilioWs.on("error", (err) => console.error("[voice-relay] Twilio ws error:", err.message));

  async function finalize() {
    if (finalized || !callSid || !db) return;
    finalized = true;
    try {
      await db.from("call_logs").update({ ai_transcript: transcript, status: "completed" }).eq("provider_call_sid", callSid).eq("is_ai_call", true);
    } catch (err) {
      console.error("[voice-relay] finalize db update failed:", err.message);
    }
  }
});

server.listen(PORT, () => console.log(`[voice-relay] listening on :${PORT}`));
