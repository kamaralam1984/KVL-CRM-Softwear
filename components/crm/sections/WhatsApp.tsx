"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, Smile, Search, Plus, Check, CheckCheck,
  MessageCircle, Megaphone, Bot, Users, Clock, Zap, ToggleLeft,
  ToggleRight, Trash2, Edit3, PlayCircle, BarChart2, ChevronDown,
  Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall,
  Calendar, MicOff, VideoOff, ScreenShare,
} from "lucide-react";
import { whatsappConversations } from "@/lib/data";
import { getWhatsappConversations } from "@/lib/actions/whatsapp";
import { cn } from "@/lib/utils";

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

const demoMessages: Record<number, { role: "in" | "out"; text: string; time: string }[]> = {
  1: [
    { role: "out", text: "Hi Alex! Following up on the CRM demo we did last week.", time: "2:30 PM" },
    { role: "in",  text: "Yes! It was really impressive. Our team loved the AI features.", time: "2:45 PM" },
    { role: "out", text: "Great! Would you like me to send over the enterprise pricing proposal?", time: "2:46 PM" },
    { role: "in",  text: "Sounds great! Can you send the contract today?", time: "2:52 PM" },
  ],
  2: [
    { role: "in",  text: "We've reviewed your proposal and it looks good.", time: "10:15 AM" },
    { role: "out", text: "Excellent! Do you have any questions about the features?", time: "10:20 AM" },
    { role: "in",  text: "We're ready to move forward with the enterprise plan.", time: "10:35 AM" },
  ],
  3: [
    { role: "out", text: "Hi Priya, quick update — your renewal is coming up next month.", time: "9:00 AM" },
    { role: "in",  text: "Thanks for the heads up. Can you share the renewal terms?", time: "9:14 AM" },
    { role: "out", text: "Sending over the renewal doc now — great working with you!", time: "9:15 AM" },
  ],
};

type BroadcastItem = { id: number; name: string; segment: string; sent: number; delivered: number; read: number; date: string; status: "sent" | "scheduled" | "draft" };
const initialBroadcasts: BroadcastItem[] = [
  { id: 1, name: "Q4 Product Update",    segment: "Enterprise",  sent: 48, delivered: 46, read: 38, date: "Dec 20", status: "sent" },
  { id: 2, name: "Holiday Greetings",    segment: "All Clients", sent: 124, delivered: 120, read: 98, date: "Dec 24", status: "sent" },
  { id: 3, name: "January Promo Offer",  segment: "SMB",         sent: 0,  delivered: 0,  read: 0,  date: "Jan 5",  status: "scheduled" },
  { id: 4, name: "Re-engagement Campaign", segment: "Cold Leads", sent: 0, delivered: 0,  read: 0,  date: "—",      status: "draft" },
];

type AutoRule = { id: number; trigger: string; response: string; active: boolean; hits: number };
const initialRules: AutoRule[] = [
  { id: 1, trigger: "pricing",    response: "Thanks for your interest! Our pricing starts at $49/mo. Would you like a detailed breakdown?", active: true,  hits: 34 },
  { id: 2, trigger: "demo",       response: "We'd love to show you a live demo! Please reply with your availability and we'll set one up.", active: true,  hits: 21 },
  { id: 3, trigger: "support",    response: "Hi! Our support team is here to help. Please describe your issue and we'll get back within 2 hours.", active: false, hits: 12 },
  { id: 4, trigger: "bye / goodbye", response: "Thanks for chatting with us! Have a wonderful day. Feel free to reach out anytime. 😊", active: true, hits: 8 },
];

export default function WhatsApp() {
  // Load conversations from Supabase on mount; falls back to seed data in demo mode
  const [convos, setConvos] = useState(whatsappConversations);
  useEffect(() => {
    getWhatsappConversations().then((rows) => { if (rows?.length) setConvos(rows); }).catch(() => {});
  }, []);
  const contacts = convos.map(c => ({ id: c.id, name: c.contact, avatar: c.avatar, segment: "Enterprise" }));

  const [activeConv, setActiveConv]   = useState(1);
  const [input, setInput]             = useState("");
  const [activeTab, setActiveTab]     = useState("chats");
  const [localMsgs, setLocalMsgs]     = useState(demoMessages);

  // Broadcast state
  const [broadcasts, setBroadcasts]   = useState(initialBroadcasts);
  const [selected, setSelected]       = useState<number[]>([]);
  const [bMsg, setBMsg]               = useState("");
  const [bName, setBName]             = useState("");
  const [bSeg, setBSeg]               = useState("All Clients");
  const [showCompose, setShowCompose] = useState(false);

  // Auto reply state
  const [rules, setRules]             = useState(initialRules);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [newTrigger, setNewTrigger]   = useState("");
  const [newResponse, setNewResponse] = useState("");

  const conv    = convos.find((c) => c.id === activeConv);
  const messages = localMsgs[activeConv] || [];

  const sendMsg = () => {
    if (!input.trim()) return;
    setLocalMsgs(p => ({ ...p, [activeConv]: [...(p[activeConv] || []), { role: "out", text: input, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }));
    setInput("");
  };

  const toggleContact = (id: number) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const sendBroadcast = () => {
    if (!bMsg.trim() || !bName.trim() || selected.length === 0) return;
    setBroadcasts(p => [...p, { id: Date.now(), name: bName, segment: bSeg, sent: selected.length, delivered: selected.length, read: 0, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), status: "sent" }]);
    setShowCompose(false); setBMsg(""); setBName(""); setSelected([]);
  };

  const addRule = () => {
    if (!newTrigger.trim() || !newResponse.trim()) return;
    setRules(p => [...p, { id: Date.now(), trigger: newTrigger, response: newResponse, active: true, hits: 0 }]);
    setShowRuleForm(false); setNewTrigger(""); setNewResponse("");
  };

  const toggleRule = (id: number) => setRules(p => p.map(r => r.id === id ? { ...r, active: !r.active } : r));
  const deleteRule = (id: number) => setRules(p => p.filter(r => r.id !== id));

  const bStatusStyle: Record<string, string> = {
    sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className="h-full flex flex-col p-5 gap-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-crm-border w-fit">
        {[
          { id: "chats",    icon: MessageCircle, label: "Chats" },
          { id: "broadcast",icon: Megaphone,     label: "Broadcast" },
          { id: "auto",     icon: Bot,           label: "Auto Reply" },
          { id: "calls",    icon: Phone,          label: "Voice Calls" },
          { id: "meetings", icon: Video,          label: "Meetings" },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all", activeTab === tab.id ? "gradient-bg text-white" : "text-slate-400 hover:text-slate-200")}
            >
              <Icon size={12} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══ CHATS TAB ══ */}
      {activeTab === "chats" && (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Contact List */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-crm-border bg-white/[0.03]">
              <Search size={13} className="text-slate-500" />
              <input placeholder="Search chats..." className="bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none flex-1" />
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {convos.map((c) => (
                <button key={c.id} onClick={() => setActiveConv(c.id)}
                  className={cn("w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all text-left", activeConv === c.id ? "bg-white/[0.07] border border-blue-500/20" : "hover:bg-white/[0.04]")}
                >
                  <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-200 truncate">{c.contact}</p>
                      <p className="text-[10px] text-slate-600 flex-shrink-0">{c.time}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{c.message}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="w-4 h-4 rounded-full gradient-bg flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat View */}
          <div className="flex-1 glass-card rounded-2xl border border-crm-border flex flex-col min-h-0 overflow-hidden">
            {conv && (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-crm-border bg-white/[0.02]">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white">
                    {conv.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200">{conv.contact}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex", m.role === "out" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[70%] rounded-2xl px-3 py-2 text-xs", m.role === "out" ? "gradient-bg text-white rounded-br-sm" : "bg-white/[0.07] border border-crm-border text-slate-300 rounded-bl-sm")}>
                        <p>{m.text}</p>
                        <div className={cn("flex items-center gap-1 mt-0.5", m.role === "out" ? "justify-end" : "justify-start")}>
                          <span className="text-[10px] opacity-60">{m.time}</span>
                          {m.role === "out" && <CheckCheck size={10} className="opacity-60" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-crm-border">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-crm-border">
                    <button className="text-slate-500 hover:text-slate-300 transition-colors"><Paperclip size={14} /></button>
                    <button className="text-slate-500 hover:text-slate-300 transition-colors"><Smile size={14} /></button>
                    <input
                      className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
                      placeholder="Type a message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                    />
                    <button onClick={sendMsg} className="w-7 h-7 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-all">
                      <Send size={12} className="text-white" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ BROADCAST TAB ══ */}
      {activeTab === "broadcast" && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Left: Contact selector */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-3">
            <div className="glass-card rounded-2xl border border-crm-border p-3 flex flex-col gap-2 flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-200">Select Recipients</p>
                <span className="text-[10px] text-blue-400 font-semibold">{selected.length} selected</span>
              </div>
              <div className="flex items-center gap-2 px-2 h-8 rounded-lg border border-crm-border bg-white/[0.03]">
                <Search size={11} className="text-slate-500" />
                <input placeholder="Search contacts..." className="bg-transparent text-[11px] text-slate-200 placeholder-slate-600 outline-none flex-1" />
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {contacts.map((c) => {
                  const isSel = selected.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleContact(c.id)}
                      className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all", isSel ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/[0.04]")}
                    >
                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all", isSel ? "gradient-bg border-transparent" : "border-crm-border")}>
                        {isSel && <Check size={9} className="text-white" />}
                      </div>
                      <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                        {c.avatar}
                      </div>
                      <span className="text-[11px] text-slate-300 truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setSelected(selected.length === contacts.length ? [] : contacts.map(c => c.id))}
                className="text-[11px] text-blue-400 hover:text-blue-300 text-center py-1 transition-colors">
                {selected.length === contacts.length ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>

          {/* Right: Compose + History */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Compose */}
            <div className="glass-card rounded-2xl border border-crm-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone size={14} className="text-blue-400" />
                  <p className="text-sm font-semibold text-slate-200">New Broadcast</p>
                </div>
                <button onClick={() => setShowCompose(!showCompose)} className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-300 transition-colors">
                  <ChevronDown size={13} className={cn("transition-transform", showCompose && "rotate-180")} />
                </button>
              </div>

              <AnimatePresence>
                {showCompose && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Broadcast Name *</label>
                        <input className={inputCls} placeholder="Q1 Campaign..." value={bName} onChange={e => setBName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Segment</label>
                        <select className={selectCls} value={bSeg} onChange={e => setBSeg(e.target.value)}>
                          {["All Clients", "Enterprise", "SMB", "Agency", "Cold Leads"].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Message *</label>
                      <textarea className={cn(inputCls, "resize-none h-20")} placeholder="Type your broadcast message here..." value={bMsg} onChange={e => setBMsg(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">{selected.length} recipient{selected.length !== 1 ? "s" : ""} selected</p>
                      <button onClick={sendBroadcast} disabled={!bMsg.trim() || !bName.trim() || selected.length === 0}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg gradient-bg text-white text-xs font-medium disabled:opacity-40 transition-all">
                        <Send size={11} /> Send Broadcast
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!showCompose && (
                <button onClick={() => setShowCompose(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-crm-border text-xs text-slate-500 hover:text-slate-300 hover:border-blue-500/30 transition-all">
                  <Plus size={12} /> Compose new broadcast
                </button>
              )}
            </div>

            {/* Broadcast History */}
            <div className="flex-1 glass-card rounded-2xl border border-crm-border overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-crm-border">
                <p className="text-xs font-semibold text-slate-300">Broadcast History</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {broadcasts.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 px-4 py-3 border-b border-crm-border/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{b.name}</p>
                      <p className="text-[10px] text-slate-500">{b.segment} · {b.date}</p>
                    </div>
                    <span className={cn("badge border text-[10px]", bStatusStyle[b.status])}>{b.status}</span>
                    {b.status === "sent" && (
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-shrink-0">
                        <span className="flex items-center gap-1"><Send size={9} /> {b.sent}</span>
                        <span className="flex items-center gap-1"><CheckCheck size={9} className="text-blue-400" /> {b.delivered}</span>
                        <span className="flex items-center gap-1"><BarChart2 size={9} className="text-emerald-400" /> {Math.round((b.read / b.sent) * 100)}%</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ AUTO REPLY TAB ══ */}
      {activeTab === "auto" && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Active Rules", value: rules.filter(r => r.active).length, icon: Zap, color: "text-blue-400" },
              { label: "Total Triggers", value: rules.reduce((s, r) => s + r.hits, 0), icon: PlayCircle, color: "text-emerald-400" },
              { label: "Avg Response", value: "< 1s", icon: Clock, color: "text-violet-400" },
              { label: "Total Rules", value: rules.length, icon: Bot, color: "text-cyan-400" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="glass-card rounded-xl border border-crm-border p-3 text-center">
                  <Icon size={14} className={cn("mx-auto mb-1", s.color)} />
                  <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Add Rule */}
          <AnimatePresence>
            {showRuleForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="glass-card rounded-2xl border border-blue-500/30 p-4 overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 mb-3">New Auto Reply Rule</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Trigger Keyword(s) *</label>
                    <input className={inputCls} placeholder="pricing, price, cost" value={newTrigger} onChange={e => setNewTrigger(e.target.value)} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-[11px] text-slate-500 block mb-1">Auto Response *</label>
                  <textarea className={cn(inputCls, "resize-none h-16")} placeholder="Type the automated reply..." value={newResponse} onChange={e => setNewResponse(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowRuleForm(false)} className="flex-1 py-1.5 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Cancel</button>
                  <button onClick={addRule} disabled={!newTrigger.trim() || !newResponse.trim()} className="flex-1 py-1.5 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40">Add Rule</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rules List */}
          <div className="flex-1 glass-card rounded-2xl border border-crm-border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-crm-border">
              <div className="flex items-center gap-2">
                <Bot size={13} className="text-violet-400" />
                <p className="text-xs font-semibold text-slate-200">Auto Reply Rules</p>
              </div>
              <button onClick={() => setShowRuleForm(!showRuleForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs">
                <Plus size={11} /> New Rule
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {rules.map((rule, i) => (
                <motion.div key={rule.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="px-4 py-3.5 border-b border-crm-border/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                          {rule.trigger}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <PlayCircle size={9} /> {rule.hits} triggers
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{rule.response}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => deleteRule(rule.id)} className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => toggleRule(rule.id)} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all", rule.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.05] text-slate-500 border border-crm-border")}>
                        {rule.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        {rule.active ? "Active" : "Off"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="px-4 py-2.5 rounded-xl bg-violet-500/5 border border-violet-500/20 flex items-center gap-2">
            <Bot size={12} className="text-violet-400 flex-shrink-0" />
            <p className="text-[11px] text-violet-300">Auto reply triggers when a message contains the keyword. Rules are case-insensitive and checked in order.</p>
          </div>
        </div>
      )}

      {/* ── VOICE CALLS ── */}
      {activeTab === "calls" && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:"Total Calls",    val:"248",  color:"#3b82f6" },
              { label:"Answered",       val:"196",  color:"#00A86B" },
              { label:"Missed",         val:"31",   color:"#ef4444" },
              { label:"Avg Duration",   val:"4:32", color:"#D4AF37" },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl p-3 border border-crm-border text-center">
                <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Call log */}
          <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-crm-border">
              <p className="text-xs font-bold text-slate-200">Recent Calls</p>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black" style={{ background:"linear-gradient(135deg,#D4AF37,#F5C842)" }}>
                <PhoneCall size={12} /> New Call
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { name:"Priya Sharma",   type:"out",    dur:"5:12", time:"Today 10:23", status:"Answered" },
                { name:"John Smith",     type:"in",     dur:"2:45", time:"Today 09:11", status:"Answered" },
                { name:"Michael Torres",type:"missed",  dur:"—",    time:"Yesterday",   status:"Missed"   },
                { name:"Sarah Chen",     type:"out",    dur:"8:30", time:"Yesterday",   status:"Answered" },
                { name:"David Chen",     type:"in",     dur:"1:05", time:"Mon 14:20",   status:"Answered" },
                { name:"Emma Wilson",    type:"missed",  dur:"—",    time:"Sun 16:45",   status:"Missed"   },
              ].map((c, i) => {
                const Icon = c.type === "out" ? PhoneOutgoing : c.type === "missed" ? PhoneMissed : PhoneIncoming;
                const col  = c.type === "out" ? "#3b82f6" : c.type === "missed" ? "#ef4444" : "#00A86B";
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: col + "18" }}>
                      <Icon size={14} style={{ color: col }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-200">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.time}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", c.status === "Missed" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400")}>{c.status}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{c.dur}</p>
                    </div>
                    <button className="ml-2 w-7 h-7 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-white/[0.08] transition-colors">
                      <Phone size={11} className="text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO MEETINGS ── */}
      {activeTab === "meetings" && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"This Month",    val:"24",    color:"#8b5cf6" },
              { label:"Avg Duration",  val:"38 min",color:"#D4AF37" },
              { label:"No-show Rate",  val:"8%",    color:"#f59e0b" },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl p-3 border border-crm-border text-center">
                <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Upcoming meetings */}
          <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-crm-border">
              <p className="text-xs font-bold text-slate-200">Upcoming Meetings</p>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black" style={{ background:"linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                <Video size={12} className="text-white" /> <span className="text-white">Schedule Meeting</span>
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { title:"Product Demo — TechFlow Inc",  with:"Sarah Chen",      time:"Today 2:00 PM",    dur:"45 min", platform:"Zoom",  link:true },
                { title:"Renewal Discussion",            with:"Priya Patel",     time:"Tomorrow 11:00 AM",dur:"30 min", platform:"Google Meet", link:true },
                { title:"Onboarding Call — RetailPro",  with:"James Okafor",    time:"Thu 3:30 PM",      dur:"60 min", platform:"KVl Meet", link:false },
                { title:"Quarterly Business Review",    with:"Marcus Williams", time:"Fri 10:00 AM",     dur:"90 min", platform:"Zoom",  link:true },
              ].map((m, i) => (
                <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.25)" }}>
                        <Video size={15} style={{ color:"#8b5cf6" }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{m.title}</p>
                        <p className="text-[10px] text-slate-500">With {m.with} · {m.dur}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-crm-border text-slate-400">{m.platform}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={9} />{m.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {m.link && (
                        <button className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background:"linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                          Join
                        </button>
                      )}
                      <button className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-crm-border text-slate-400 hover:text-slate-200 transition-colors">
                        <Calendar size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Quick join bar */}
          <div className="glass-card rounded-xl p-4 border border-crm-border flex items-center gap-3">
            <Video size={16} className="text-violet-400 flex-shrink-0" />
            <input placeholder="Paste meeting link or ID to join instantly…"
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none" />
            <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:"linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>Join Now</button>
          </div>
        </div>
      )}
    </div>
  );
}
