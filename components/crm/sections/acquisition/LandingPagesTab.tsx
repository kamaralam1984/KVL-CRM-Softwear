"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6b (Attribution + Landing Pages + Lead Journey)
// Computed from visitor_sessions (per-session landing_page/pages_viewed/duration)
// — richer than Wave 2's landing_pages table, which only tracks aggregate hit
// counts and stays in place as a cheaper "which pages get traffic" rollup.

import { Layout } from "lucide-react";
import { Card, EmptyState, DataTable, type Column } from "@/components/ui";
import type { VisitorSession } from "@/lib/tracking/types";
import type { Lead } from "@/lib/actions/leads";

interface LandingPageRow {
  page: string;
  sessions: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDurationSeconds: number;
  leadsGenerated: number;
}

function computeLandingPageStats(sessions: VisitorSession[], leads: Lead[]): LandingPageRow[] {
  const byPage = new Map<
    string,
    { sessions: number; visitors: Set<string>; bounces: number; totalDuration: number; endedSessions: number }
  >();

  for (const s of sessions) {
    const page = s.landing_page || "(unknown)";
    const entry = byPage.get(page) ?? { sessions: 0, visitors: new Set<string>(), bounces: 0, totalDuration: 0, endedSessions: 0 };
    entry.sessions += 1;
    entry.visitors.add(s.visitor_id);
    if (s.pages_viewed <= 1) entry.bounces += 1;
    if (s.ended_at) {
      entry.totalDuration += s.duration_seconds;
      entry.endedSessions += 1;
    }
    byPage.set(page, entry);
  }

  const leadVisitorIds = new Set(leads.filter((l) => l.visitor_id).map((l) => l.visitor_id as string));

  return Array.from(byPage.entries())
    .map(([page, e]) => ({
      page,
      sessions: e.sessions,
      uniqueVisitors: e.visitors.size,
      bounceRate: e.sessions ? Math.round((e.bounces / e.sessions) * 100) : 0,
      avgDurationSeconds: e.endedSessions ? Math.round(e.totalDuration / e.endedSessions) : 0,
      leadsGenerated: Array.from(e.visitors).filter((v) => leadVisitorIds.has(v)).length,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export default function LandingPagesTab({ sessions, leads, loading }: { sessions: VisitorSession[]; leads: Lead[]; loading: boolean }) {
  const rows = computeLandingPageStats(sessions, leads);

  const columns: Column<LandingPageRow>[] = [
    { key: "page", label: "Landing Page", weight: 1.6, render: (r) => <span className="font-mono text-[11px] text-slate-200 truncate">{r.page}</span> },
    { key: "sessions", label: "Sessions", align: "center", weight: 0.7 },
    { key: "uniqueVisitors", label: "Unique Visitors", align: "center", weight: 0.8 },
    {
      key: "bounceRate",
      label: "Bounce Rate",
      align: "center",
      weight: 0.8,
      render: (r) => <span className={r.bounceRate >= 70 ? "text-rose-400" : r.bounceRate >= 40 ? "text-amber-400" : "text-emerald-400"}>{r.bounceRate}%</span>,
    },
    { key: "avgDurationSeconds", label: "Avg Session", align: "center", weight: 0.8, render: (r) => <span className="text-slate-300">{formatDuration(r.avgDurationSeconds)}</span> },
    { key: "leadsGenerated", label: "Leads", align: "center", weight: 0.6, render: (r) => <span className="text-emerald-400 font-semibold">{r.leadsGenerated}</span> },
  ];

  return (
    <Card
      title="Landing Page Performance"
      subtitle="Computed from real session data — traffic, engagement and lead conversion per page"
    >
      {loading ? (
        <EmptyState icon={<Layout size={18} className="animate-pulse" />} title="Loading landing pages…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Layout size={18} />}
          title="No landing page data yet"
          hint="Sessions are recorded automatically as visitors browse the marketing site."
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.page} />
      )}
    </Card>
  );
}
