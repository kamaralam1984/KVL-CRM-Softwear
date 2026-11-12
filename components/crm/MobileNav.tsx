"use client";
// Phone-only bottom tab bar (native-app feel). Hidden from md breakpoint up, where the sidebar takes over.
import { LayoutDashboard, Users, Briefcase, MessageCircle, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "deals", label: "Deals", icon: Briefcase },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
] as const;

export default function MobileNav({ activeSection, onSectionChange, onMore }: { activeSection: string; onSectionChange: (id: string) => void; onMore: () => void }) {
  const moreActive = !TABS.some((t) => t.id === activeSection);
  return (
    <nav aria-label="Primary" className="md:hidden flex-shrink-0 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)]" style={{ background: "var(--nav-bg)", borderColor: "var(--border-col)" }}>
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id;
        return (
          <button key={id} onClick={() => onSectionChange(id)} aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition-colors active:scale-95", active ? "text-[#D4AF37]" : "text-slate-500")}>
            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />{label}
          </button>
        );
      })}
      <button onClick={onMore} aria-label="Open menu" className={cn("flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition-colors active:scale-95", moreActive ? "text-[#D4AF37]" : "text-slate-500")}>
        <Menu size={20} strokeWidth={moreActive ? 2.4 : 1.8} />More
      </button>
    </nav>
  );
}
