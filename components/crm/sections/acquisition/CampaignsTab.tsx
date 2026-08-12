"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine.
// Extracted from AcquisitionOverview.tsx (Wave 6a) — unchanged behavior.

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Card, Badge, EmptyState, DataTable, type Column, type BadgeTone } from "@/components/ui";
import { updateCampaign } from "@/lib/actions/campaigns";
import { computeCampaignRoi } from "@/lib/attribution/roi";
import { formatCurrency } from "@/lib/utils";
import type { Campaign } from "@/lib/attribution/types";
import type { Lead } from "@/lib/actions/leads";
import { timeAgo } from "./VisitorsTab";

const statusTone: Record<Campaign["status"], BadgeTone> = {
  active: "emerald",
  paused: "amber",
  ended: "slate",
};

/** Inline-editable spend cell — persists via updateCampaign() on blur. */
function SpendCell({ campaign, onSaved }: { campaign: Campaign; onSaved: (c: Campaign) => void }) {
  const [value, setValue] = useState(String(campaign.spend));
  const [saving, setSaving] = useState(false);

  async function commit() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed === campaign.spend) {
      setValue(String(campaign.spend));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCampaign(campaign.id, { spend: parsed });
      onSaved(updated);
    } catch {
      setValue(String(campaign.spend));
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="number"
      min={0}
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      className="w-24 bg-[#0a1628] border border-crm-border rounded-lg px-2 py-1 text-xs text-slate-200 outline-none focus:border-blue-500/50 disabled:opacity-50"
      aria-label={`Spend for ${campaign.name}`}
    />
  );
}

export default function CampaignsTab({
  campaigns,
  leads,
  loading,
  onCampaignSaved,
}: {
  campaigns: Campaign[];
  leads: Lead[];
  loading: boolean;
  onCampaignSaved: (c: Campaign) => void;
}) {
  const campaignColumns: Column<Campaign>[] = [
    { key: "name", label: "Campaign", weight: 1.3, render: (c) => <span className="text-slate-200 font-medium">{c.name}</span> },
    {
      key: "source",
      label: "Source / Medium",
      weight: 1,
      render: (c) => <span className="text-slate-300">{c.source || "—"} · {c.medium || "—"}</span>,
    },
    { key: "status", label: "Status", weight: 0.6, render: (c) => <Badge tone={statusTone[c.status]}>{c.status}</Badge> },
    {
      key: "spend",
      label: "Spend",
      weight: 0.7,
      render: (c) => <SpendCell campaign={c} onSaved={onCampaignSaved} />,
    },
    {
      key: "revenue",
      label: "Revenue (first-touch)",
      weight: 1,
      render: (c) => {
        const roi = computeCampaignRoi(c, leads);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-200">{formatCurrency(roi.revenue)}</span>
            <span className="text-[10px] text-slate-500">{roi.closedCount} closed of {roi.leadCount} leads</span>
          </div>
        );
      },
    },
    {
      key: "roas",
      label: "ROAS",
      weight: 0.6,
      render: (c) => {
        const roi = computeCampaignRoi(c, leads);
        return <span className={roi.roas !== null && roi.roas >= 1 ? "text-emerald-400" : "text-slate-400"}>{roi.roas !== null ? `${roi.roas.toFixed(1)}x` : "—"}</span>;
      },
    },
    { key: "first_seen_at", label: "First Seen", weight: 0.7, render: (c) => <span className="text-slate-400">{timeAgo(c.first_seen_at)}</span> },
    { key: "last_seen_at", label: "Last Seen", weight: 0.7, render: (c) => <span className="text-slate-400">{timeAgo(c.last_seen_at)}</span> },
  ];

  return (
    <Card>
      {loading ? (
        <EmptyState icon={<Megaphone size={18} className="animate-pulse" />} title="Loading campaigns…" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={18} />}
          title="No campaigns yet"
          hint="Campaigns are auto-created the first time a visitor arrives with a utm_campaign param — e.g. /pricing?utm_source=google&utm_medium=cpc&utm_campaign=diwali_sale."
        />
      ) : (
        <DataTable columns={campaignColumns} rows={campaigns} rowKey={(c) => c.id} />
      )}
    </Card>
  );
}
