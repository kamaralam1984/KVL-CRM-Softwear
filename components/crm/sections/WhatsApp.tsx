"use client";
// WhatsApp CRM — one real workspace (the same engines as the Communication Hub):
//   Chats      → unified inbox (real threads, media, delivery ticks, assignment, templates)
//   Broadcast  → bulk send with audience, schedule, delivery/read/reply report
//   Auto Reply → keyword rules saved in the DB, applied to every inbound message
//   Calls      → click-to-call + call outcomes
//   Setup      → connect the business number (Cloud API / QR / Twilio)
import { useState } from "react";
import { MessageCircle, Megaphone, Bot, Phone, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import InboxTab from "./comms/InboxTab";
import BroadcastTab from "./comms/BroadcastTab";
import AutoReplyTab from "./comms/AutoReplyTab";
import CallsTab from "./comms/CallsTab";
import WhatsAppSetupTab from "./comms/WhatsAppSetupTab";

const TABS = [
  { id: "chats", label: "Chats", icon: MessageCircle, el: InboxTab },
  { id: "broadcast", label: "Broadcast", icon: Megaphone, el: BroadcastTab },
  { id: "auto", label: "Auto Reply", icon: Bot, el: AutoReplyTab },
  { id: "calls", label: "Calls", icon: Phone, el: CallsTab },
  { id: "setup", label: "Setup", icon: Plug, el: WhatsAppSetupTab },
] as const;

export default function WhatsApp() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("chats");
  const Active = TABS.find((t) => t.id === tab)!.el;
  return (
    <div className="h-full flex flex-col p-5 gap-4">
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-crm-border w-fit max-w-full overflow-x-auto" role="tablist" aria-label="WhatsApp CRM">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all whitespace-nowrap", tab === t.id ? "gradient-bg text-white" : "text-slate-400 hover:text-slate-200")}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto"><Active /></div>
    </div>
  );
}
