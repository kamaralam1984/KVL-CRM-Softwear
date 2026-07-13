import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatTone = "emerald" | "blue" | "violet" | "amber" | "rose" | "slate";

const textMap: Record<StatTone, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  violet: "text-violet-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  slate: "text-slate-300",
};

const iconBgMap: Record<StatTone, string> = {
  emerald: "bg-emerald-500/10 border-emerald-500/20",
  blue: "bg-blue-500/10 border-blue-500/20",
  violet: "bg-violet-500/10 border-violet-500/20",
  amber: "bg-amber-500/10 border-amber-500/20",
  rose: "bg-rose-500/10 border-rose-500/20",
  slate: "bg-slate-500/10 border-slate-500/20",
};

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  /** e.g. "+12.4%" — positive strings render emerald, ones starting with "-" render rose. */
  change?: string;
  tone?: StatTone;
  className?: string;
}

/** KPI tile matching the Finance / Dashboard stat cards. */
export function StatTile({ label, value, icon, change, tone = "slate", className }: StatTileProps) {
  const changeTone = change?.trim().startsWith("-") ? "text-rose-400" : "text-emerald-400";
  return (
    <div className={cn("glass-card rounded-xl border border-crm-border p-4", className)}>
      {icon && (
        <div
          className={cn(
            "w-9 h-9 rounded-xl border flex items-center justify-center mb-2",
            iconBgMap[tone],
            textMap[tone]
          )}
        >
          {icon}
        </div>
      )}
      <p className={cn("text-xl font-bold", textMap[tone])}>{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
      {change && <p className={cn("mt-1 text-xs font-medium", changeTone)}>{change}</p>}
    </div>
  );
}

export default StatTile;
