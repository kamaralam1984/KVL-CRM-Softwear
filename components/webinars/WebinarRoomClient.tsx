"use client";
// Phase 45 — Webinar Funnels. The room: plays either an evergreen
// (pre-recorded) video or a real YouTube Live iframe embed — no live-video
// engine of our own, same honest framing as every comparable product in
// this space. Fires join/watch-time tracking + polls a lightweight room
// chat, mirroring public/kvl-chat.js's polling shape in miniature.

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  recordWebinarJoin, recordWatchTime, postWebinarChatMessage, getWebinarChatMessages,
  type WebinarRow, type WebinarChatMessage,
} from "@/lib/actions/webinars";

const GOLD = "#D4AF37";

function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diffMs = new Date(scheduledAt).getTime() - Date.now();
      if (diffMs <= 0) { setLabel(""); return; }
      const h = Math.floor(diffMs / 3_600_000);
      const m = Math.floor((diffMs % 3_600_000) / 60_000);
      const s = Math.floor((diffMs % 60_000) / 1000);
      setLabel(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);
  if (!label) return null;
  return (
    <div className="text-center py-16">
      <p className="text-sm mb-2 opacity-70">Starts in</p>
      <p className="text-4xl font-black" style={{ color: GOLD }}>{label}</p>
    </div>
  );
}

function ChatPanel({ webinarId }: { webinarId: string }) {
  const [messages, setMessages] = useState<WebinarChatMessage[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const lastFetchRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const load = () => {
      getWebinarChatMessages(webinarId, lastFetchRef.current).then((rows) => {
        if (rows.length) {
          setMessages((prev) => [...prev, ...rows]);
          lastFetchRef.current = rows[rows.length - 1].created_at;
        }
      }).catch(() => {});
    };
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [webinarId]);

  const send = async () => {
    if (!text.trim()) return;
    await postWebinarChatMessage(webinarId, name || "Guest", text.trim()).catch(() => {});
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-bold opacity-70 mb-2 px-1">Live Chat</p>
      <div className="flex-1 overflow-y-auto space-y-1.5 px-1 mb-2" style={{ maxHeight: 320 }}>
        {messages.map((m) => (
          <p key={m.id} className="text-xs"><span className="font-semibold">{m.name}:</span> {m.body}</p>
        ))}
        {messages.length === 0 && <p className="text-xs opacity-50">No messages yet — say hello!</p>}
      </div>
      <div className="flex gap-1.5 px-1">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
          className="w-20 h-8 rounded-lg px-2 text-xs border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Say something…"
          className="flex-1 h-8 rounded-lg px-2 text-xs border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
        <button onClick={send} className="h-8 px-3 rounded-lg text-xs font-semibold" style={{ background: GOLD, color: "#000" }}>Send</button>
      </div>
    </div>
  );
}

export default function WebinarRoomClient({ webinar }: { webinar: WebinarRow }) {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("r");
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!registrationId || joinedRef.current) return;
    joinedRef.current = true;
    recordWebinarJoin(registrationId).catch(() => {});
  }, [registrationId]);

  useEffect(() => {
    if (!registrationId) return;
    const id = setInterval(() => {
      recordWatchTime(registrationId, 30).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [registrationId]);

  // Date.now() can't be called during render (impure) — tracked as state,
  // set once on mount and re-checked once the countdown reaches zero.
  const [notStarted, setNotStarted] = useState(false);
  useEffect(() => {
    const scheduledAt = webinar.scheduled_at;
    const check = () => setNotStarted(Boolean(scheduledAt) && new Date(scheduledAt as string).getTime() > Date.now());
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [webinar.scheduled_at]);

  return (
    <div className="min-h-screen" style={{ background: "#080c14", color: "#e2e8f0" }}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">{webinar.title}</h1>
        <p className="text-sm opacity-60 mb-6">{webinar.description}</p>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "#000" }}>
            {notStarted && webinar.scheduled_at ? (
              <Countdown scheduledAt={webinar.scheduled_at} />
            ) : webinar.kind === "youtube_live" && webinar.youtube_video_id ? (
              <iframe
                className="w-full aspect-video"
                src={`https://www.youtube.com/embed/${webinar.youtube_video_id}?autoplay=0`}
                title={webinar.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : webinar.video_url ? (
              <video src={webinar.video_url} controls className="w-full aspect-video" />
            ) : (
              <div className="aspect-video flex items-center justify-center text-sm opacity-50">Video not configured yet.</div>
            )}
          </div>

          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ChatPanel webinarId={webinar.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
