import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "emerald" | "blue" | "violet" | "amber" | "rose" | "slate";

const toneMap: Record<BadgeTone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/** Pill badge mapping a semantic tone to the CRM's bg/text/border token classes. */
export function Badge({ tone = "slate", children, className }: BadgeProps) {
  return (
    <span className={cn("badge border inline-flex items-center gap-1", toneMap[tone], className)}>
      {children}
    </span>
  );
}

export default Badge;
