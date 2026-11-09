"use client";
import { useState } from "react";
import { MessageCircle, Mail, PhoneCall, Repeat, ListOrdered, FileText, BellRing, BarChart3, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import InboxTab from "./comms/InboxTab";
import EmailTab from "./comms/EmailTab";
import CallsTab from "./comms/CallsTab";
import TemplatesTab from "./comms/TemplatesTab";
import SequenceTab from "./comms/SequenceTab";
import RemindersTab from "./comms/RemindersTab";
import ReportsTab from "./comms/ReportsTab";
import SettingsTab from "./comms/SettingsTab";
import FollowUpEngine from "./automation/FollowUpEngine";

const TABS = [
  { id: "inbox", label: "Inbox", icon: MessageCircle, el: InboxTab },
  { id: "email", label: "Email", icon: Mail, el: EmailTab },
  { id: "calls", label: "Calls", icon: PhoneCall, el: CallsTab },
  { id: "followups", label: "Follow-ups", icon: Repeat, el: FollowUpEngine },
  { id: "sequence", label: "Sequence", icon: ListOrdered, el: SequenceTab },
  { id: "templates", label: "Templates", icon: FileText, el: TemplatesTab },
  { id: "reminders", label: "Reminders", icon: BellRing, el: RemindersTab },
  { id: "reports", label: "Reports", icon: BarChart3, el: ReportsTab },
  { id: "settings", label: "Settings & DNC", icon: Settings2, el: SettingsTab },
] as const;

export default function CommsHub() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("inbox");
  const Active = TABS.find((t) => t.id === tab)!.el;
  return (
    <div className="h-full flex flex-col bg-[#080c14] overflow-hidden">
      <div className="px-4 pt-4 flex gap-1 overflow-x-auto flex-shrink-0" role="tablist" aria-label="Communication Hub">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold rounded-t-xl whitespace-nowrap transition-all",
              tab === t.id ? "text-[#c9a84c] bg-[#0d1420] border-t border-l border-r border-white/[0.08]" : "text-slate-500 hover:text-slate-300")}>
            <t.icon size={11} />{t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-[#0d1420] border border-white/[0.06] rounded-b-2xl rounded-tr-2xl mx-4 mb-4 p-3"><Active /></div>
    </div>
  );
}
