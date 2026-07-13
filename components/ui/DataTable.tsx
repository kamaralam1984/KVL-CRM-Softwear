import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

export type ColumnAlign = "left" | "center" | "right";

export interface Column<T> {
  /** Unique column id; also used to read a cell value from the row when no render is given. */
  key: keyof T | string;
  label: ReactNode;
  align?: ColumnAlign;
  /** Optional flex weight for the grid track (default 1). */
  weight?: number;
  render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Custom empty state; falls back to a default EmptyState. */
  empty?: ReactNode;
  /** Stable row key extractor. Falls back to array index. */
  rowKey?: (row: T, index: number) => string | number;
  className?: string;
}

const alignMap: Record<ColumnAlign, string> = {
  left: "text-left justify-start",
  center: "text-center justify-center",
  right: "text-right justify-end",
};

function cellValue<T>(row: T, key: keyof T | string): ReactNode {
  const value = (row as Record<string, unknown>)[key as string];
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return String(value);
}

/**
 * Generic, CSS-grid based data table matching the CRM's glass-card list style.
 * Uses plain grid rows (never the Tailwind `table-row` class, which breaks grid layout).
 */
export function DataTable<T>({ columns, rows, empty, rowKey, className }: DataTableProps<T>) {
  const gridTemplateColumns = columns
    .map((c) => `minmax(0, ${c.weight ?? 1}fr)`)
    .join(" ");

  return (
    <div
      role="table"
      className={cn(
        "glass-card rounded-2xl border border-crm-border overflow-hidden",
        className
      )}
    >
      <div
        role="row"
        className="grid gap-3 px-4 py-2.5 border-b border-crm-border text-[11px] font-semibold text-slate-500 uppercase tracking-wide"
        style={{ gridTemplateColumns }}
      >
        {columns.map((col) => (
          <div
            key={String(col.key)}
            role="columnheader"
            className={cn("flex items-center", alignMap[col.align ?? "left"])}
          >
            {col.label}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        empty ?? <EmptyState title="No data" hint="There is nothing to show here yet." />
      ) : (
        rows.map((row, i) => (
          <div
            key={rowKey ? rowKey(row, i) : i}
            role="row"
            className="grid gap-3 px-4 py-3 border-b border-crm-border/50 last:border-0 items-center hover:bg-white/[0.02] transition-colors"
            style={{ gridTemplateColumns }}
          >
            {columns.map((col) => (
              <div
                key={String(col.key)}
                role="cell"
                className={cn("flex items-center text-xs text-slate-300", alignMap[col.align ?? "left"])}
              >
                {col.render ? col.render(row, i) : cellValue(row, col.key)}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default DataTable;
