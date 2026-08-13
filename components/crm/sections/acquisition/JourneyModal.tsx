"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6b (Attribution + Landing Pages + Lead Journey)
// Fetched on-demand only when opened for a specific visitor — never prefetched.

import { useEffect, useState } from "react";
import { Megaphone, MousePointerClick, UserCheck, Loader2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { EmptyState } from "@/components/ui";
import { getVisitorJourney, type VisitorJourney } from "@/lib/actions/journey";

interface TimelineEntry {
  at: string;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  highlight?: boolean;
}

function buildTimeline(journey: VisitorJourney): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const t of journey.touchpoints) {
    entries.push({
      at: t.occurred_at,
      icon: <Megaphone size={13} className="text-blue-400" />,
      label: `Touchpoint: ${t.source || "direct"}${t.medium ? ` · ${t.medium}` : ""}`,
      detail: t.campaign || undefined,
    });
  }

  for (const e of journey.events) {
    entries.push({
      at: e.created_at,
      icon: <MousePointerClick size={13} className="text-violet-400" />,
      label: e.event_name.replace(/_/g, " "),
      detail: e.page_url || undefined,
    });
  }

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (journey.link) {
    entries.push({
      at: journey.link.matchedAt,
      icon: <UserCheck size={13} className="text-emerald-400" />,
      label: journey.link.matchedOn === "new" ? "Identified — new Lead created" : `Identified — matched existing Lead (by ${journey.link.matchedOn})`,
      detail: `Lead #${journey.link.leadId}`,
      highlight: true,
    });
  }

  return entries;
}

// Parent renders this with `key={visitorId}` so switching visitors remounts
// it — a fresh loading=true/journey=null via useState's own initial values,
// rather than resetting state synchronously inside the effect body.
export default function JourneyModal({ visitorId, open, onClose }: { visitorId: string; open: boolean; onClose: () => void }) {
  const [journey, setJourney] = useState<VisitorJourney | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    getVisitorJourney(visitorId)
      .then(setJourney)
      .finally(() => setLoading(false));
  }, [open, visitorId]);

  const timeline = journey ? buildTimeline(journey) : [];

  return (
    <Modal open={open} onClose={onClose} title={`Journey — ${visitorId}`} wide>
      {loading ? (
        <EmptyState icon={<Loader2 size={18} className="animate-spin" />} title="Loading journey…" />
      ) : timeline.length === 0 ? (
        <EmptyState icon={<Megaphone size={18} />} title="No journey data yet" hint="Touchpoints and events appear here as this visitor browses the site." />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto space-y-1">
          {timeline.map((entry, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 py-2.5 px-3 rounded-xl border-b border-crm-border/50 last:border-0 ${entry.highlight ? "bg-emerald-500/5 border border-emerald-500/20" : ""}`}
            >
              <div className="w-6 h-6 rounded-lg bg-white/[0.05] border border-crm-border flex items-center justify-center flex-shrink-0 mt-0.5">
                {entry.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-200 capitalize">{entry.label}</p>
                {entry.detail && <p className="text-[11px] text-slate-500 truncate">{entry.detail}</p>}
              </div>
              <span className="text-[10px] text-slate-600 flex-shrink-0">{new Date(entry.at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
