"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6a (Acquisition Dashboard Core)

import { Users, Fingerprint, Flame, Megaphone } from "lucide-react";
import { Card, StatTile } from "@/components/ui";
import type { Visitor } from "@/lib/tracking/types";
import type { Campaign } from "@/lib/attribution/types";
import type { Lead } from "@/lib/actions/leads";

interface FunnelStage {
  label: string;
  count: number;
}

function buildFunnel(visitors: Visitor[], leads: Lead[]): FunnelStage[] {
  const engaged = visitors.filter((v) => v.page_views > 1 || v.session_count > 1).length;
  const highIntent = visitors.filter((v) => v.intent_band === "hot" || v.intent_band === "very_hot").length;
  const acquisitionLeads = leads.filter((l) => l.visitor_id);
  const qualified = acquisitionLeads.filter((l) => l.stage !== "Discovery").length;
  const closed = acquisitionLeads.filter((l) => l.stage === "Closed").length;

  return [
    { label: "Visitors", count: visitors.length },
    { label: "Engaged", count: engaged },
    { label: "High Intent", count: highIntent },
    { label: "Leads", count: acquisitionLeads.length },
    { label: "Qualified", count: qualified },
    { label: "Closed", count: closed },
  ];
}

function FunnelBar({ stage, first, previous }: { stage: FunnelStage; first: number; previous: number | null }) {
  const widthPct = first > 0 ? Math.max(4, (stage.count / first) * 100) : 4;
  const conversionPct = previous && previous > 0 ? Math.round((stage.count / previous) * 100) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-300">{stage.label}</span>
        <span className="text-xs font-semibold text-slate-200">
          {stage.count.toLocaleString()}
          {conversionPct !== null && <span className="ml-2 text-[11px] font-normal text-slate-500">{conversionPct}% of previous</span>}
        </span>
      </div>
      <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${widthPct}%`, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)" }}
        />
      </div>
    </div>
  );
}

export default function OverviewTab({
  visitors,
  campaigns,
  leads,
  loading,
}: {
  visitors: Visitor[];
  campaigns: Campaign[];
  leads: Lead[];
  loading: boolean;
}) {
  const identified = visitors.filter((v) => v.identified).length;
  const hotVisitors = visitors.filter((v) => v.intent_band === "hot" || v.intent_band === "very_hot").length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const funnel = buildFunnel(visitors, leads);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tracked Visitors" value={visitors.length} icon={<Users size={16} />} tone="blue" />
        <StatTile label="Identified" value={identified} icon={<Fingerprint size={16} />} tone="emerald" />
        <StatTile label="Hot / Very Hot Visitors" value={hotVisitors} icon={<Flame size={16} />} tone="rose" />
        <StatTile label="Active Campaigns" value={activeCampaigns} icon={<Megaphone size={16} />} tone="violet" />
      </div>

      <Card
        title="Acquisition Funnel"
        subtitle="Visitor → Engaged → High Intent → Lead → Qualified → Closed, computed from live tracking data"
      >
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            {funnel.map((stage, i) => (
              <FunnelBar key={stage.label} stage={stage} first={funnel[0].count} previous={i > 0 ? funnel[i - 1].count : null} />
            ))}
            <p className="text-[11px] text-slate-600 pt-1">
              Deal → Customer → Revenue attribution isn&apos;t in this funnel yet — customers/deals have no link back to the
              originating lead in this schema today. That join lands in Wave 7.
            </p>
          </div>
        )}
      </Card>
    </>
  );
}
