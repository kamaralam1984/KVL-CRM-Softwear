import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** Centered empty-state placeholder for lists, tables and panels. */
export function EmptyState({ icon, title, hint, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-2 py-10 px-4",
        className
      )}
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-crm-border flex items-center justify-center text-slate-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      {hint && <p className="text-[11px] text-slate-500 max-w-xs">{hint}</p>}
    </div>
  );
}

export default EmptyState;
