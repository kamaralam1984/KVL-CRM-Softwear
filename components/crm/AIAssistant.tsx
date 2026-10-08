"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const quickCommands = [
  "Show pending deals",
  "Find hot leads",
  "Generate sales report",
  "Top customers this month",
  "Overdue invoices",
  "Team performance",
  "Hot visitors right now",
  "Next best action",
];

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface Rect { x: number; y: number; w: number; h: number }

const MIN_W = 320;
const MIN_H = 360;
const MARGIN = 24;
const STORAGE_KEY = "crm_ai_chat_rect";

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// Keep the window fully on-screen and within the min/max size limits.
function fit(r: Rect): Rect {
  const w = clamp(r.w, Math.min(MIN_W, window.innerWidth), window.innerWidth);
  const h = clamp(r.h, Math.min(MIN_H, window.innerHeight), window.innerHeight);
  return { w, h, x: clamp(r.x, 0, window.innerWidth - w), y: clamp(r.y, 0, window.innerHeight - h) };
}

function initialRect(): Rect {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && ["x", "y", "w", "h"].every((k) => typeof saved[k] === "number")) return fit(saved);
  } catch { /* ignore */ }
  const w = Math.min(384, window.innerWidth - MARGIN * 2);
  const h = Math.min(560, window.innerHeight - MARGIN * 2);
  return fit({ w, h, x: window.innerWidth - w - MARGIN, y: window.innerHeight - h - MARGIN });
}

// Edge/corner handles: dir letters say which sides move (n/s/e/w).
const HANDLES: { dir: string; cls: string; cursor: string }[] = [
  { dir: "n",  cls: "top-0 left-3 right-3 h-1.5",       cursor: "ns-resize" },
  { dir: "s",  cls: "bottom-0 left-3 right-3 h-1.5",    cursor: "ns-resize" },
  { dir: "e",  cls: "right-0 top-3 bottom-3 w-1.5",     cursor: "ew-resize" },
  { dir: "w",  cls: "left-0 top-3 bottom-3 w-1.5",      cursor: "ew-resize" },
  { dir: "nw", cls: "top-0 left-0 w-3 h-3",             cursor: "nwse-resize" },
  { dir: "ne", cls: "top-0 right-0 w-3 h-3",            cursor: "nesw-resize" },
  { dir: "sw", cls: "bottom-0 left-0 w-3 h-3",          cursor: "nesw-resize" },
  { dir: "se", cls: "bottom-0 right-0 w-3 h-3",         cursor: "nwse-resize" },
];

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
}

export default function AIAssistant({ open, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content: "Hi! I'm your AI CRM assistant powered by Claude. I can analyze your pipeline, find hot leads, generate reports, and more. Try a quick command below!",
      time: "now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const rectRef = useRef<Rect | null>(null);

  useEffect(() => { rectRef.current = rect; }, [rect]);

  useEffect(() => {
    if (open && !rectRef.current) setRect(initialRect());
  }, [open]);

  // Re-fit when the browser window is resized so the box never gets lost.
  useEffect(() => {
    const onResize = () => setRect((r) => (r ? fit(r) : r));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // mode "move" drags the whole box; otherwise it's a resize direction.
  const startGesture = useCallback((e: React.PointerEvent, mode: string) => {
    if (e.button !== 0 || !rectRef.current) return;
    if (mode === "move" && (e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const start = rectRef.current;
    const sx = e.clientX, sy = e.clientY;
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { x, y, w, h } = start;
      if (mode === "move") {
        x = clamp(start.x + dx, 0, window.innerWidth - w);
        y = clamp(start.y + dy, 0, window.innerHeight - h);
      } else {
        if (mode.includes("e")) w = clamp(start.w + dx, MIN_W, window.innerWidth - start.x);
        if (mode.includes("s")) h = clamp(start.h + dy, MIN_H, window.innerHeight - start.y);
        if (mode.includes("w")) { w = clamp(start.w - dx, MIN_W, start.x + start.w); x = start.x + start.w - w; }
        if (mode.includes("n")) { h = clamp(start.h - dy, MIN_H, start.y + start.h); y = start.y + start.h - h; }
      }
      setRect({ x, y, w, h });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.userSelect = prevSelect;
      try { if (rectRef.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(rectRef.current)); } catch { /* ignore */ }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const history = messages
      .filter((m) => m.id !== 0)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: Message = { id: Date.now(), role: "user", content: text, time: "now" };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsTyping(true);

    const aiId = Date.now() + 1;
    setMessages((p) => [...p, { id: aiId, role: "assistant", content: "", time: "now" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((p) =>
          p.map((m) => (m.id === aiId ? { ...m, content: full } : m))
        );
      }
    } catch {
      setMessages((p) =>
        p.map((m) =>
          m.id === aiId
            ? { ...m, content: "Sorry, I couldn't connect to the AI. Please check your ANTHROPIC_API_KEY in .env.local." }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {open && rect && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="fixed glass-card border rounded-2xl flex flex-col z-50 overflow-hidden"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 32px rgba(59,130,246,0.1)", borderColor: "var(--border-col)" }}
        >
          {/* Resize handles */}
          {HANDLES.map((h) => (
            <div
              key={h.dir}
              onPointerDown={(e) => startGesture(e, h.dir)}
              className={cn("absolute z-10", h.cls)}
              style={{ cursor: h.cursor, touchAction: "none" }}
            />
          ))}

          {/* Header (drag to move) */}
          <div
            onPointerDown={(e) => startGesture(e, "move")}
            className="flex items-center gap-3 px-4 py-3 border-b border-crm-border cursor-move select-none"
            style={{ background: "rgba(59,130,246,0.08)", touchAction: "none" }}
          >
            <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center neon-blue">
              <Sparkles size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-100">AI CRM Assistant</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-500">Powered by Claude AI</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
              <X size={15} className="text-slate-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Sparkles size={10} className="text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "gradient-bg text-white"
                      : "bg-white/[0.06] border border-crm-border text-slate-300"
                  )}
                  style={{ whiteSpace: "pre-line" }}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                  <Sparkles size={10} className="text-white" />
                </div>
                <div className="bg-white/[0.06] border border-crm-border rounded-xl px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Commands */}
          <div className="px-3 pb-2">
            <div className="flex flex-wrap gap-1">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => sendMessage(cmd)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.05] border border-crm-border text-slate-400 hover:border-blue-500/40 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-crm-border">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-crm-border rounded-xl px-3 py-2 focus-within:border-blue-500/50 transition-colors">
              <input
                type="text"
                placeholder="Ask anything about your CRM..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
              />
              <button className="text-slate-500 hover:text-slate-300 transition-colors">
                <Mic size={14} />
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center disabled:opacity-40 transition-opacity"
              >
                {isTyping ? <Loader2 size={11} className="text-white animate-spin" /> : <Send size={11} className="text-white" />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
