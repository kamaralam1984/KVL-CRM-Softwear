"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Plus, ChevronDown, ChevronRight, Send, Smile, Paperclip,
  Bold, Italic, Code, Pin, MessageSquare, Users, FileText,
  MoreHorizontal, X, ChevronLeft, AtSign, Search, Bell,
  Image, File, FileCode, Mic, Video,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "online" | "away" | "offline";

interface Reaction { emoji: string; count: number; users: string[] }
interface Message {
  id: string;
  userId: string;
  text: string;
  time: string;
  reactions?: Reaction[];
  isPinned?: boolean;
  replyTo?: string;
}
interface Channel { id: string; name: string; emoji?: string; unread?: number; description: string }
interface DMUser { id: string; name: string; avatar: string; status: Status; unread?: number }
interface TeamMember { id: string; name: string; avatar: string; role: string }

// ─── Static data ─────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  { id: "general",     name: "general",     unread: 3, description: "General company-wide announcements and conversation." },
  { id: "sales-team",  name: "sales-team",             description: "Sales team discussions, leads, and deal updates." },
  { id: "deals-won",   name: "deals-won",   emoji: "🎉", description: "Celebrate closed deals here! 🎉" },
  { id: "marketing",   name: "marketing",              description: "Marketing campaigns, content, and strategy." },
  { id: "engineering", name: "engineering",             description: "Engineering updates and technical discussions." },
];

const DM_USERS: DMUser[] = [
  { id: "marcus",  name: "Marcus Rivera",  avatar: "MR", status: "online",  unread: 2 },
  { id: "priya",   name: "Priya Kapoor",   avatar: "PK", status: "online"              },
  { id: "sarah",   name: "Sarah Chen",     avatar: "SC", status: "away"                },
  { id: "jake",    name: "Jake Williams",  avatar: "JW", status: "offline"             },
];

const TEAM_MEMBERS: TeamMember[] = [
  { id: "alex",   name: "Alex Morgan",   avatar: "AM", role: "Sales Lead"      },
  { id: "marcus", name: "Marcus Rivera", avatar: "MR", role: "Account Exec"    },
  { id: "priya",  name: "Priya Kapoor",  avatar: "PK", role: "Sales Strategist"},
  { id: "sarah",  name: "Sarah Chen",    avatar: "SC", role: "Marketing Lead"  },
  { id: "jake",   name: "Jake Williams", avatar: "JW", role: "SDR"             },
];

const MESSAGES: Message[] = [
  { id: "1",  userId: "alex",   time: "9:02 AM",  text: "Morning team! Heads up — I have back-to-back demos until noon, ping me after." },
  { id: "2",  userId: "marcus", time: "9:05 AM",  text: "Hey team, just closed the TechFlow deal! $48K ARR 🎉", reactions: [{ emoji: "🎉", count: 4, users: ["priya","sarah","jake","alex"] }, { emoji: "🔥", count: 3, users: ["priya","jake","alex"] }] },
  { id: "3",  userId: "priya",  time: "9:06 AM",  text: "Amazing!! That's our biggest deal this quarter 🙌" },
  { id: "4",  userId: "sarah",  time: "9:06 AM",  text: "YES! @marcus you absolute legend 🏆", reactions: [{ emoji: "😂", count: 2, users: ["marcus","jake"] }] },
  { id: "5",  userId: "jake",   time: "9:07 AM",  text: "@marcus the demo went really well, they loved the WhatsApp CRM feature" },
  { id: "6",  userId: "marcus", time: "9:08 AM",  text: "Thanks everyone! @priya great work on the follow-up emails, those definitely helped close it." },
  { id: "7",  userId: "priya",  time: "9:09 AM",  text: "Happy to help! I spent a lot of time personalizing those sequences 😄" },
  { id: "8",  userId: "alex",   time: "9:15 AM",  text: "Q3 target: $320K — we're at $298K, just $22K to go! 💪", reactions: [{ emoji: "💪", count: 3, users: ["marcus","priya","sarah"] }], isPinned: true },
  { id: "9",  userId: "sarah",  time: "9:18 AM",  text: "So close! We can absolutely hit that before EOQ." },
  { id: "10", userId: "jake",   time: "9:22 AM",  text: "Who has bandwidth to take the new CloudScale lead? They want a demo this week" },
  { id: "11", userId: "marcus", time: "9:24 AM",  text: "I can take it — @sarah can you send me the deck? The updated one with the new pricing slides." },
  { id: "12", userId: "sarah",  time: "9:25 AM",  text: "On it! Sending over now. Also including the case study doc — they'll love the Fintech vertical examples.", isPinned: true },
  { id: "13", userId: "priya",  time: "9:30 AM",  text: "I'd suggest leading with the ROI calculator on slide 4, that always lands well in demos." },
  { id: "14", userId: "jake",   time: "9:31 AM",  text: "Good call @priya. Marcus, want to do a quick 15-min prep call before the demo?" },
  { id: "15", userId: "marcus", time: "9:33 AM",  text: "Absolutely, let's do tomorrow 10 AM. I'll send a calendar invite." },
  { id: "16", userId: "alex",   time: "9:40 AM",  text: "Love the energy this morning 🙏 Let's keep it going. Friday goal: first contact with at least 3 new enterprise leads each." },
  { id: "17", userId: "priya",  time: "9:41 AM",  text: "Challenge accepted! I already have 2 warm leads from LinkedIn I haven't touched yet." },
  { id: "18", userId: "sarah",  time: "9:42 AM",  text: "Same, I have a referral from the TechFlow AE — could be a nice expansion play too 👀" },
];

const SHARED_FILES = [
  { name: "Q3_Sales_Deck_v4.pptx", size: "3.2 MB", icon: FileText, time: "Today" },
  { name: "CloudScale_CaseStudy.pdf", size: "1.1 MB", icon: File,     time: "Today" },
  { name: "ROI_Calculator.xlsx",     size: "840 KB", icon: FileCode,  time: "Yesterday" },
];

const USER_AVATARS: Record<string, { initials: string; color: string }> = {
  alex:   { initials: "AM", color: "#6366f1" },
  marcus: { initials: "MR", color: "#00A86B" },
  priya:  { initials: "PK", color: "#D4AF37" },
  sarah:  { initials: "SC", color: "#e879f9" },
  jake:   { initials: "JW", color: "#f97316" },
};

const USER_NAMES: Record<string, string> = {
  alex: "Alex Morgan", marcus: "Marcus Rivera", priya: "Priya Kapoor", sarah: "Sarah Chen", jake: "Jake Williams",
};

const CURRENT_USER_ID = "alex";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(s: Status) {
  return s === "online" ? "#00A86B" : s === "away" ? "#D4AF37" : "#4b5563";
}

function renderText(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} style={{ color: "#D4AF37", fontWeight: 600 }}>{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ userId, size = 32 }: { userId: string; size?: number }) {
  const info = USER_AVATARS[userId] ?? { initials: "??", color: "#374151" };
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold select-none"
      style={{ width: size, height: size, background: info.color, fontSize: size * 0.35, color: "#fff" }}
    >
      {info.initials}
    </div>
  );
}

// ─── TypingIndicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <Avatar userId="priya" size={22} />
      <span className="text-xs" style={{ color: "#6b7280" }}>Priya is typing</span>
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#D4AF37" }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MessageRow ──────────────────────────────────────────────────────────────

function MessageRow({
  msg,
  grouped,
  onReact,
}: {
  msg: Message;
  grouped: boolean;
  onReact: (id: string, emoji: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative group px-4"
      style={{ paddingTop: grouped ? 2 : 14 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex gap-3">
        {/* Avatar or spacer */}
        {grouped ? (
          <div className="flex-shrink-0 w-8" />
        ) : (
          <Avatar userId={msg.userId} size={32} />
        )}

        <div className="flex-1 min-w-0">
          {/* Name + time header */}
          {!grouped && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                {USER_NAMES[msg.userId] ?? msg.userId}
              </span>
              <span className="text-xs" style={{ color: "#4b5563" }}>{msg.time}</span>
              {msg.isPinned && (
                <span className="text-xs flex items-center gap-0.5" style={{ color: "#D4AF37" }}>
                  <Pin size={10} /> pinned
                </span>
              )}
            </div>
          )}

          {/* Message text */}
          <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
            {renderText(msg.text)}
          </p>

          {/* Reactions */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {msg.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact(msg.id, r.emoji)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all"
                  style={{
                    background: "rgba(212,175,55,0.1)",
                    border: "1px solid rgba(212,175,55,0.25)",
                    color: "#D4AF37",
                  }}
                >
                  {r.emoji} <span style={{ color: "#94a3b8" }}>{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="absolute right-4 top-1 flex items-center gap-0.5 rounded-lg px-1 py-0.5"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {[{ icon: Smile, label: "React" }, { icon: MessageSquare, label: "Reply" }, { icon: Pin, label: "Pin" }, { icon: MoreHorizontal, label: "More" }].map(({ icon: Icon, label }) => (
              <button
                key={label}
                title={label}
                className="p-1 rounded transition-colors hover:text-white"
                style={{ color: "#6b7280" }}
              >
                <Icon size={14} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function KVlChat() {
  const [activeChannel, setActiveChannel] = useState<string>("sales-team");
  const [activeDM, setActiveDM]           = useState<string | null>(null);
  const [messages, setMessages]           = useState<Message[]>(MESSAGES);
  const [input, setInput]                 = useState("");
  const [channelsOpen, setChannelsOpen]   = useState(true);
  const [dmsOpen, setDmsOpen]             = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [userStatus, setUserStatus]       = useState<Status>("online");
  const [showEmojiHint, setShowEmojiHint] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentChannel = CHANNELS.find((c) => c.id === activeChannel) ?? CHANNELS[0];
  const pinnedMessages = messages.filter((m) => m.isPinned);

  function handleReact(id: string, emoji: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const reactions = m.reactions ? [...m.reactions] : [];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx === -1) {
          return { ...m, reactions: [...reactions, { emoji, count: 1, users: [CURRENT_USER_ID] }] };
        }
        const r = reactions[idx];
        if (r.users.includes(CURRENT_USER_ID)) {
          const updated = { ...r, count: r.count - 1, users: r.users.filter((u) => u !== CURRENT_USER_ID) };
          const filtered = updated.count === 0 ? reactions.filter((_, i) => i !== idx) : reactions.map((x, i) => i === idx ? updated : x);
          return { ...m, reactions: filtered };
        } else {
          reactions[idx] = { ...r, count: r.count + 1, users: [...r.users, CURRENT_USER_ID] };
          return { ...m, reactions };
        }
      })
    );
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), userId: CURRENT_USER_ID, time, text },
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Group consecutive messages from same user
  function isGrouped(idx: number) {
    if (idx === 0) return false;
    return messages[idx].userId === messages[idx - 1].userId;
  }

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ background: "#080c14", color: "#e2e8f0", fontFamily: "inherit" }}
    >
      {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
      <div
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: 240,
          background: "#0d1117",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Workspace header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>KVl</p>
            <p className="text-xs" style={{ color: "#D4AF37" }}>FreedomWithAI</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Bell size={14} style={{ color: "#4b5563" }} />
            <ChevronDown size={14} style={{ color: "#4b5563" }} />
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs"
            style={{ background: "rgba(255,255,255,0.05)", color: "#4b5563" }}
          >
            <Search size={12} />
            <span>Search</span>
            <span className="ml-auto opacity-60">⌘K</span>
          </div>
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {/* CHANNELS */}
          <div>
            <button
              className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase tracking-widest rounded transition-colors hover:bg-white/5"
              style={{ color: "#4b5563" }}
              onClick={() => setChannelsOpen((p) => !p)}
            >
              {channelsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              Channels
            </button>
            <AnimatePresence>
              {channelsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {CHANNELS.map((ch) => {
                    const isActive = activeChannel === ch.id && activeDM === null;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => { setActiveChannel(ch.id); setActiveDM(null); }}
                        className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors text-left"
                        style={{
                          background: isActive ? "rgba(212,175,55,0.12)" : "transparent",
                          color: isActive ? "#D4AF37" : "#94a3b8",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        <Hash size={13} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{ch.emoji ? `${ch.name} ${ch.emoji}` : ch.name}</span>
                        {ch.unread && (
                          <span
                            className="text-[10px] font-bold px-1 rounded-full"
                            style={{ background: "#D4AF37", color: "#080c14" }}
                          >
                            {ch.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <button
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors"
                    style={{ color: "#4b5563" }}
                  >
                    <Plus size={13} />
                    <span>Add Channel</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DIRECT MESSAGES */}
          <div className="mt-2">
            <button
              className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase tracking-widest rounded transition-colors hover:bg-white/5"
              style={{ color: "#4b5563" }}
              onClick={() => setDmsOpen((p) => !p)}
            >
              {dmsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              Direct Messages
            </button>
            <AnimatePresence>
              {dmsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {DM_USERS.map((dm) => {
                    const isActive = activeDM === dm.id;
                    return (
                      <button
                        key={dm.id}
                        onClick={() => setActiveDM(dm.id)}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors text-left"
                        style={{
                          background: isActive ? "rgba(212,175,55,0.12)" : "transparent",
                          color: isActive ? "#D4AF37" : "#94a3b8",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: USER_AVATARS[dm.id]?.color ?? "#374151", color: "#fff" }}
                          >
                            {dm.avatar}
                          </div>
                          <div
                            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0d1117]"
                            style={{ background: statusColor(dm.status) }}
                          />
                        </div>
                        <span className="flex-1 truncate text-xs">{dm.name}</span>
                        {dm.unread && (
                          <span
                            className="text-[10px] font-bold px-1 rounded-full"
                            style={{ background: "#D4AF37", color: "#080c14" }}
                          >
                            {dm.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Current user footer */}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="relative flex-shrink-0">
            <Avatar userId={CURRENT_USER_ID} size={28} />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0d1117]"
              style={{ background: statusColor(userStatus) }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>Alex Morgan</p>
            <select
              value={userStatus}
              onChange={(e) => setUserStatus(e.target.value as Status)}
              className="text-[10px] bg-transparent outline-none cursor-pointer"
              style={{ color: "#4b5563" }}
            >
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── MAIN CHAT AREA ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Channel header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d1117" }}
        >
          <div className="flex items-center gap-2">
            {activeDM ? (
              <>
                <div className="relative">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: USER_AVATARS[activeDM]?.color ?? "#374151", color: "#fff" }}
                  >
                    {DM_USERS.find((d) => d.id === activeDM)?.avatar}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0d1117]"
                    style={{ background: statusColor(DM_USERS.find((d) => d.id === activeDM)?.status ?? "offline") }}
                  />
                </div>
                <span className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>
                  {DM_USERS.find((d) => d.id === activeDM)?.name}
                </span>
              </>
            ) : (
              <>
                <Hash size={16} style={{ color: "#D4AF37" }} />
                <span className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>
                  {currentChannel.emoji ? `${currentChannel.name} ${currentChannel.emoji}` : currentChannel.name}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#6b7280" }}>
                  {TEAM_MEMBERS.length} members
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded transition-colors hover:bg-white/5" style={{ color: "#4b5563" }}>
              <Search size={15} />
            </button>
            <button
              className="p-1.5 rounded transition-colors hover:bg-white/5"
              style={{ color: infoPanelOpen ? "#D4AF37" : "#4b5563" }}
              onClick={() => setInfoPanelOpen((p) => !p)}
              title="Toggle info panel"
            >
              {infoPanelOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "thin" }}>
          {/* Date separator */}
          <div className="flex items-center gap-3 px-4 my-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#4b5563" }}>
              Today
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {!activeDM && messages.map((msg, idx) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              grouped={isGrouped(idx)}
              onReact={handleReact}
            />
          ))}

          {activeDM && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: USER_AVATARS[activeDM]?.color ?? "#374151", color: "#fff" }}
              >
                {DM_USERS.find((d) => d.id === activeDM)?.avatar}
              </div>
              <p className="text-base font-semibold" style={{ color: "#e2e8f0" }}>
                {DM_USERS.find((d) => d.id === activeDM)?.name}
              </p>
              <p className="text-sm" style={{ color: "#4b5563" }}>
                This is the beginning of your direct message history.
              </p>
            </div>
          )}

          {/* Typing indicator */}
          {!activeDM && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Message input */}
        <div
          className="px-4 pb-4 pt-2 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
          >
            {/* Formatting toolbar */}
            <div
              className="flex items-center gap-1 px-3 py-1.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              {[{ icon: Bold, label: "Bold" }, { icon: Italic, label: "Italic" }, { icon: Code, label: "Code" }].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  title={label}
                  className="p-1 rounded transition-colors hover:bg-white/10"
                  style={{ color: "#4b5563" }}
                >
                  <Icon size={13} />
                </button>
              ))}
              <div className="w-px h-4 mx-1" style={{ background: "rgba(255,255,255,0.08)" }} />
              <button
                className="p-1 rounded transition-colors hover:bg-white/10 text-xs font-medium"
                style={{ color: "#4b5563" }}
              >
                <AtSign size={13} />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${activeDM ? DM_USERS.find((d) => d.id === activeDM)?.name : currentChannel.name}`}
              className="w-full resize-none bg-transparent outline-none text-sm px-3 py-2"
              style={{ color: "#e2e8f0", caretColor: "#D4AF37" }}
            />

            {/* Action row */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-1">
                <button
                  title="Emoji"
                  className="p-1.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: "#4b5563" }}
                  onClick={() => setShowEmojiHint((p) => !p)}
                >
                  <Smile size={16} />
                </button>
                <button
                  title="Attach file"
                  className="p-1.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: "#4b5563" }}
                >
                  <Paperclip size={16} />
                </button>
                <button
                  title="Image"
                  className="p-1.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: "#4b5563" }}
                >
                  <Image size={16} />
                </button>
                <button
                  title="Audio"
                  className="p-1.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: "#4b5563" }}
                >
                  <Mic size={16} />
                </button>
                {showEmojiHint && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs ml-1"
                    style={{ color: "#D4AF37" }}
                  >
                    Type : to insert emoji
                  </motion.span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: input.trim() ? "#D4AF37" : "rgba(212,175,55,0.15)",
                  color: input.trim() ? "#080c14" : "rgba(212,175,55,0.4)",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                }}
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT INFO PANEL ───────────────────────────────────────── */}
      <AnimatePresence>
        {infoPanelOpen && !activeDM && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 overflow-hidden"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#0d1117" }}
          >
            <div className="flex flex-col h-full overflow-y-auto" style={{ width: 260 }}>
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                  # {currentChannel.name}
                </span>
                <button
                  onClick={() => setInfoPanelOpen(false)}
                  className="p-1 rounded transition-colors hover:bg-white/10"
                  style={{ color: "#4b5563" }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
                {/* Description */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#4b5563" }}>About</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>
                    {currentChannel.description}
                  </p>
                </div>

                {/* Pinned Messages */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Pin size={12} style={{ color: "#D4AF37" }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#4b5563" }}>
                      Pinned ({pinnedMessages.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {pinnedMessages.map((pm) => (
                      <div
                        key={pm.id}
                        className="p-2 rounded-lg text-xs"
                        style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)" }}
                      >
                        <p className="font-semibold mb-0.5" style={{ color: "#D4AF37" }}>
                          {USER_NAMES[pm.userId]}
                        </p>
                        <p className="leading-relaxed" style={{ color: "#6b7280" }}>
                          {pm.text.length > 80 ? pm.text.slice(0, 80) + "…" : pm.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Members */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={12} style={{ color: "#00A86B" }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#4b5563" }}>
                      Members ({TEAM_MEMBERS.length})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {TEAM_MEMBERS.map((m) => (
                      <div
                        key={m.id}
                        title={m.name}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
                        style={{ background: USER_AVATARS[m.id]?.color ?? "#374151", color: "#fff" }}
                      >
                        {USER_AVATARS[m.id]?.initials}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {TEAM_MEMBERS.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ background: USER_AVATARS[m.id]?.color ?? "#374151", color: "#fff" }}
                        >
                          {USER_AVATARS[m.id]?.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>{m.name}</p>
                          <p className="text-[10px] truncate" style={{ color: "#4b5563" }}>{m.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shared Files */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} style={{ color: "#6366f1" }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#4b5563" }}>
                      Files ({SHARED_FILES.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {SHARED_FILES.map((f) => {
                      const Icon = f.icon;
                      return (
                        <div
                          key={f.name}
                          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <Icon size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>{f.name}</p>
                            <p className="text-[10px]" style={{ color: "#4b5563" }}>{f.size} · {f.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
