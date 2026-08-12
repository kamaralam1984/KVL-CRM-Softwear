"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine.
// Tab shell — Overview/Visitors/Campaigns/Live tabs live in ./acquisition/*.
// Wave 6b (Attribution, richer Landing Pages analytics, Lead Journey) still
// to come; see docs/ACQUISITION_ENGINE_ROADMAP.md.

import { useEffect, useState } from "react";
import { LayoutDashboard, Users, Megaphone, Radar as RadarIcon } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getVisitors } from "@/lib/actions/visitors";
import { getCampaigns } from "@/lib/actions/campaigns";
import { getLeads, type Lead } from "@/lib/actions/leads";
import type { Visitor } from "@/lib/tracking/types";
import type { Campaign } from "@/lib/attribution/types";
import OverviewTab from "./acquisition/OverviewTab";
import VisitorsTab from "./acquisition/VisitorsTab";
import CampaignsTab from "./acquisition/CampaignsTab";
import LiveActivityTab from "./acquisition/LiveActivityTab";

type Tab = "overview" | "visitors" | "campaigns" | "live";

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "visitors", label: "Visitors", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "live", label: "Live", icon: RadarIcon },
];

export default function AcquisitionOverview() {
  const [tab, setTab] = useState<Tab>("overview");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getVisitors(), getCampaigns(), getLeads()])
      .then(([v, c, l]) => {
        setVisitors(v);
        setCampaigns(c);
        setLeads(l);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-5 h-full overflow-y-auto space-y-4">
      <SectionHeader
        title="Visitor Intelligence"
        subtitle="Anonymous visitors, campaigns and live activity captured by the tracking SDK — the Acquisition Engine"
        actions={
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-crm-border">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    tab === t.id ? "bg-white/[0.08] text-slate-100" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>
        }
      />

      {tab === "overview" && <OverviewTab visitors={visitors} campaigns={campaigns} leads={leads} loading={loading} />}
      {tab === "visitors" && <VisitorsTab visitors={visitors} loading={loading} />}
      {tab === "campaigns" && (
        <CampaignsTab
          campaigns={campaigns}
          leads={leads}
          loading={loading}
          onCampaignSaved={(updated) => setCampaigns((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
        />
      )}
      {tab === "live" && <LiveActivityTab />}
    </div>
  );
}
