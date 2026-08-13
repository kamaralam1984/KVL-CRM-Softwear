"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6a (Acquisition Dashboard Core)
// Polling-based "live" view — this codebase has no websocket/Supabase-Realtime
// wiring anywhere, so a 15s poll is the honest real-or-mock equivalent of
// spec's "use real-time updates where infrastructure supports it."

import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { Card, Badge, EmptyState, DataTable, type Column } from "@/components/ui";
import { getVisitors } from "@/lib/actions/visitors";
import type { Visitor } from "@/lib/tracking/types";
import { intentTone, timeAgo } from "./VisitorsTab";

const ACTIVE_WINDOW_MS = 5 * 60_000;
const POLL_INTERVAL_MS = 15_000;

export default function LiveActivityTab({ siteId }: { siteId?: string } = {}) {
  const [active, setActive] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function load() {
      getVisitors(siteId)
        .then((v) => {
          if (cancelled) return;
          const now = Date.now();
          setActive(v.filter((visitor) => now - new Date(visitor.last_seen_at).getTime() < ACTIVE_WINDOW_MS));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [siteId]);

  const columns: Column<Visitor>[] = [
    { key: "visitor_id", label: "Visitor", weight: 1.3, render: (v) => <span className="font-mono text-[11px] text-slate-300">{v.visitor_id}</span> },
    { key: "first_touch_source", label: "Source", weight: 0.9, render: (v) => <span className="text-slate-300">{v.first_touch_source || "direct"}</span> },
    { key: "landing_page", label: "Landing Page", weight: 1.4, render: (v) => <span className="text-slate-400 truncate">{v.landing_page || "—"}</span> },
    {
      key: "intent_score",
      label: "Intent",
      weight: 0.9,
      render: (v) => (
        <Badge tone={intentTone[v.intent_band]}>
          {v.intent_score} · {v.intent_band.replace("_", " ")}
        </Badge>
      ),
    },
    { key: "last_seen_at", label: "Last Seen", weight: 0.7, render: (v) => <span className="text-emerald-400">{timeAgo(v.last_seen_at)}</span> },
  ];

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 w-fit">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-semibold text-emerald-400">{active.length} Active Visitor{active.length === 1 ? "" : "s"}</span>
        <span className="text-[11px] text-slate-500">· last 5 minutes · refreshes every 15s</span>
      </div>

      <Card>
        {loading ? (
          <EmptyState icon={<Radar size={18} className="animate-pulse" />} title="Loading live activity…" />
        ) : active.length === 0 ? (
          <EmptyState
            icon={<Radar size={18} />}
            title="No active visitors right now"
            hint="Anyone browsing the marketing site in the last 5 minutes shows up here automatically."
          />
        ) : (
          <DataTable columns={columns} rows={active} rowKey={(v) => v.visitor_id} />
        )}
      </Card>
    </>
  );
}
