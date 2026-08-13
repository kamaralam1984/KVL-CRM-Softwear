"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine.
// Tab shell — Overview/Visitors/Campaigns/Pages/Live tabs live in ./acquisition/*.

import { useEffect, useState } from "react";
import { LayoutDashboard, Users, Megaphone, Radar as RadarIcon, Layout } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getVisitors } from "@/lib/actions/visitors";
import { getCampaigns } from "@/lib/actions/campaigns";
import { getLeads, type Lead } from "@/lib/actions/leads";
import { getVisitorSessions } from "@/lib/actions/sessions";
import { getTouchpointsByVisitorIds } from "@/lib/actions/touchpoints";
import { listSites } from "@/lib/actions/sites";
import type { Visitor, VisitorSession } from "@/lib/tracking/types";
import type { Campaign, CampaignTouchpoint } from "@/lib/attribution/types";
import type { Site } from "@/lib/sites/types";
import OverviewTab from "./acquisition/OverviewTab";
import VisitorsTab from "./acquisition/VisitorsTab";
import CampaignsTab from "./acquisition/CampaignsTab";
import LandingPagesTab from "./acquisition/LandingPagesTab";
import LiveActivityTab from "./acquisition/LiveActivityTab";

type Tab = "overview" | "visitors" | "campaigns" | "pages" | "live";

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "visitors", label: "Visitors", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "pages", label: "Pages", icon: Layout },
  { id: "live", label: "Live", icon: RadarIcon },
];

export default function AcquisitionOverview() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState<string>(""); // "" = All Sites
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [touchpointsByVisitor, setTouchpointsByVisitor] = useState<Map<string, CampaignTouchpoint[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSites().then(setSites).catch(() => setSites([]));
  }, []);

  useEffect(() => {
    const filter = siteId || undefined;
    Promise.all([getVisitors(filter), getCampaigns(filter), getLeads(), getVisitorSessions(filter)])
      .then(async ([v, c, allLeads, s]) => {
        setVisitors(v);
        setCampaigns(c);
        setSessions(s);

        // getLeads() stays a global, cross-site view by design (the core CRM's
        // Leads section shows every lead regardless of site — see
        // docs/ACQUISITION_ENGINE_ROADMAP.md Wave 10). When a specific site is
        // selected here, narrow to leads tied to that site's own visitors —
        // computed from the already-filtered visitor list rather than adding a
        // site_id filter to getLeads() itself, so the core CRM stays untouched.
        const l = filter ? allLeads.filter((lead) => lead.visitor_id && v.some((vis) => vis.visitor_id === lead.visitor_id)) : allLeads;
        setLeads(l);

        // Bounded — only visitors behind a Closed lead matter for attribution ROI.
        const closedVisitorIds = Array.from(
          new Set(l.filter((lead) => lead.visitor_id && lead.stage === "Closed").map((lead) => lead.visitor_id as string))
        );
        const touchpoints = await getTouchpointsByVisitorIds(closedVisitorIds, filter);
        const grouped = new Map<string, CampaignTouchpoint[]>();
        for (const t of touchpoints) {
          if (!grouped.has(t.visitor_id)) grouped.set(t.visitor_id, []);
          grouped.get(t.visitor_id)!.push(t);
        }
        setTouchpointsByVisitor(grouped);
      })
      .finally(() => setLoading(false));
  }, [siteId]);

  return (
    <div className="p-5 h-full overflow-y-auto space-y-4">
      <SectionHeader
        title="Visitor Intelligence"
        subtitle="Anonymous visitors, campaigns and live activity captured by the tracking SDK — the Acquisition Engine"
        actions={
          <div className="flex items-center gap-2">
            {sites.length > 0 && (
              <select
                value={siteId}
                onChange={(e) => {
                  setLoading(true);
                  setSiteId(e.target.value);
                }}
                className="bg-white/[0.03] border border-crm-border rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500/50"
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>
                    {s.name || s.site_id}
                  </option>
                ))}
              </select>
            )}
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
          </div>
        }
      />

      {tab === "overview" && <OverviewTab visitors={visitors} campaigns={campaigns} leads={leads} loading={loading} />}
      {tab === "visitors" && <VisitorsTab visitors={visitors} loading={loading} />}
      {tab === "campaigns" && (
        <CampaignsTab
          campaigns={campaigns}
          leads={leads}
          touchpointsByVisitor={touchpointsByVisitor}
          loading={loading}
          onCampaignSaved={(updated) => setCampaigns((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
        />
      )}
      {tab === "pages" && <LandingPagesTab sessions={sessions} leads={leads} loading={loading} />}
      {tab === "live" && <LiveActivityTab siteId={siteId || undefined} />}
    </div>
  );
}
