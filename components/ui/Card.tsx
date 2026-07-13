import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Glass-card wrapper matching the CRM section design language.
 * Optional header row (icon + title/subtitle + actions) rendered only when provided.
 */
export function Card({ title, subtitle, icon, actions, children, className }: CardProps) {
  const hasHeader = Boolean(title || subtitle || icon || actions);
  return (
    <div className={cn("glass-card rounded-2xl border border-crm-border p-5", className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-crm-border flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            {(title || subtitle) && (
              <div className="min-w-0">
                {title && <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>}
                {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
