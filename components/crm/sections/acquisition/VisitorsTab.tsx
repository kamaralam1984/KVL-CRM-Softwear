"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine.
// Extracted from AcquisitionOverview.tsx (Wave 6a) — unchanged behavior.

import { useState } from "react";
import { Users, Fingerprint, Radar, Eye, GitCommitHorizontal } from "lucide-react";
import { Card, StatTile, Badge, EmptyState, DataTable, type Column, type BadgeTone } from "@/components/ui";
import type { Visitor } from "@/lib/tracking/types";
import JourneyModal from "./JourneyModal";

export const intentTone: Record<Visitor["intent_band"], BadgeTone> = {
  cold: "slate",
  warm: "amber",
  hot: "rose",
  very_hot: "violet",
};

export function timeAgo(iso: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function VisitorsTab({ visitors, loading }: { visitors: Visitor[]; loading: boolean }) {
  const [journeyVisitorId, setJourneyVisitorId] = useState<string | null>(null);
  const identified = visitors.filter((v) => v.identified).length;
  const totalSessions = visitors.reduce((sum, v) => sum + v.session_count, 0);
  const totalPageViews = visitors.reduce((sum, v) => sum + v.page_views, 0);

  const columns: Column<Visitor>[] = [
    { key: "visitor_id", label: "Visitor", weight: 1.4, render: (v) => <span className="font-mono text-[11px] text-slate-300">{v.visitor_id}</span> },
    {
      key: "first_touch_source",
      label: "Source / Campaign",
      weight: 1.6,
      render: (v) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-200">{v.first_touch_source || "direct"} · {v.first_touch_medium || "none"}</span>
          {v.first_touch_campaign && <span className="text-[10px] text-slate-500">{v.first_touch_campaign}</span>}
        </div>
      ),
    },
    { key: "page_views", label: "Views", align: "center", weight: 0.6 },
    { key: "session_count", label: "Sessions", align: "center", weight: 0.6 },
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
    {
      key: "identified",
      label: "Status",
      weight: 0.8,
      render: (v) => <Badge tone={v.identified ? "emerald" : "slate"}>{v.identified ? "Identified" : "Anonymous"}</Badge>,
    },
    { key: "last_seen_at", label: "Last Seen", weight: 0.8, render: (v) => <span className="text-slate-400">{timeAgo(v.last_seen_at)}</span> },
    {
      key: "journey",
      label: "",
      align: "center",
      weight: 0.5,
      render: (v) => (
        <button
          onClick={() => setJourneyVisitorId(v.visitor_id)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-crm-border text-[10px] text-slate-400 hover:text-blue-400 hover:border-blue-500/40 transition-colors"
        >
          <GitCommitHorizontal size={11} /> Journey
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tracked Visitors" value={visitors.length} icon={<Users size={16} />} tone="blue" />
        <StatTile label="Identified" value={identified} icon={<Fingerprint size={16} />} tone="emerald" />
        <StatTile label="Total Sessions" value={totalSessions} icon={<Radar size={16} />} tone="violet" />
        <StatTile label="Total Page Views" value={totalPageViews} icon={<Eye size={16} />} tone="amber" />
      </div>

      <Card>
        {loading ? (
          <EmptyState icon={<Radar size={18} className="animate-pulse" />} title="Loading visitors…" />
        ) : visitors.length === 0 ? (
          <EmptyState
            icon={<Radar size={18} />}
            title="No visitors tracked yet"
            hint="Visit the marketing site (landing page, /pricing, /features, /contact) to generate first-party visitor and session data."
          />
        ) : (
          <DataTable columns={columns} rows={visitors} rowKey={(v) => v.visitor_id} />
        )}
      </Card>

      {journeyVisitorId && (
        <JourneyModal key={journeyVisitorId} visitorId={journeyVisitorId} open={!!journeyVisitorId} onClose={() => setJourneyVisitorId(null)} />
      )}
    </>
  );
}
