"use client";
import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Bot, User, Building2 } from "lucide-react";
import { Card, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  usedAi?: boolean;
  error?: boolean;
}

interface AskResponse {
  answer: string;
  usedAi: boolean;
}

const STARTERS = [
  "What's the price for a CRM + SEO?",
  "What's the timeline for a mobile app?",
  "Explain your AMC tiers",
] as const;

export default function SalesAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [company, setCompany] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now(), role: "user", content: question };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: { company: company.trim() || undefined, services: [] as string[] },
        }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const data = (await res.json()) as AskResponse;
      setMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.answer,
          usedAi: data.usedAi,
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="AI Sales Assistant"
        subtitle="Ask about pricing, timelines, services and AMC plans"
        actions={
          <Badge tone="violet" className="gap-1">
            <Sparkles size={11} /> Assistant
          </Badge>
        }
      />

      <Card className="flex flex-col h-[70vh] min-h-[480px] p-0 overflow-hidden">
        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col h-full items-center justify-center gap-5">
              <EmptyState
                icon={<Sparkles size={20} />}
                title="How can I help you close deals?"
                hint="Ask anything about our services, pricing or delivery timelines."
              />
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.05] border border-crm-border text-slate-400 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-end gap-2",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-300">
                      <Bot size={14} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "gradient-bg text-white rounded-br-sm"
                        : m.error
                          ? "bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-bl-sm"
                          : "bg-white/[0.05] border border-crm-border text-slate-200 rounded-bl-sm"
                    )}
                  >
                    {m.role === "assistant" && !m.error && (
                      <div className="mb-1.5">
                        <Badge tone={m.usedAi ? "violet" : "blue"}>
                          {m.usedAi ? "AI" : "KB"}
                        </Badge>
                      </div>
                    )}
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-crm-border flex items-center justify-center flex-shrink-0 text-slate-400">
                      <User size={14} />
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-end gap-2 justify-start"
                >
                  <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-300">
                    <Bot size={14} />
                  </div>
                  <div className="bg-white/[0.05] border border-crm-border rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1" aria-label="Assistant is typing">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-crm-border p-3 space-y-2">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-crm-border rounded-xl px-3 py-1.5 focus-within:border-violet-500/40 transition-colors max-w-[240px]">
            <Building2 size={13} className="text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company (optional)"
              aria-label="Company name (optional)"
              className="flex-1 bg-transparent text-[11px] text-slate-200 placeholder-slate-600 outline-none min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 bg-white/[0.04] border border-crm-border rounded-xl px-3 py-2 focus-within:border-violet-500/50 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about pricing, timelines, AMC tiers..."
              aria-label="Ask the sales assistant a question"
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              {isLoading ? (
                <Loader2 size={12} className="text-white animate-spin" />
              ) : (
                <Send size={12} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
