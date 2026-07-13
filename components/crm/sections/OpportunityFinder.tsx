"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Search,
  Loader2,
  Globe,
  Building2,
  Target,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Bot,
  Gauge,
} from "lucide-react";
import {
  Card,
  StatTile,
  Badge,
  SectionHeader,
  EmptyState,
  type BadgeTone,
} from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  OpportunityReport,
  OpportunityGap,
  ServiceRecommendation,
} from "@/lib/opportunity/types";

type Priority = ServiceRecommendation["priority"];
type Severity = OpportunityGap["severity"];

const priorityTone: Record<Priority, BadgeTone> = {
  high: "rose",
  medium: "blue",
  low: "slate",
};

const severityTone: Record<Severity, BadgeTone> = {
  high: "rose",
  medium: "amber",
  low: "slate",
};

/** Coerce an unknown value into a safe currency string. */
function money(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return formatCurrency(value);
}

/** Opportunity Score tone shifts with the score band. */
function scoreTone(score: number): "emerald" | "amber" | "rose" | "slate" {
  if (!Number.isFinite(score)) return "slate";
  if (score >= 70) return "emerald";
  if (score >= 40) return "amber";
  return "rose";
}

/**
 * OpportunityFinder — UI for the Opportunity Engine.
 * Enter a company website (+ optional name), POST to /api/opportunity/analyze,
 * and render the detected gaps and sellable service recommendations.
 */
export default function OpportunityFinder() {
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<OpportunityReport | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/opportunity/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, company: company.trim() || undefined }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed (${res.status})`);
      }

      const data: OpportunityReport = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const gaps = (report?.gaps ?? []).filter((g) => g.missing);
  const services = report?.services ?? [];

  const inputCls =
    "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500/50 transition-colors";

  return (
    <div className="p-5 h-full overflow-y-auto space-y-4">
      <SectionHeader
        title="Opportunity Finder"
        subtitle="Scan a company website to surface gaps and sellable services"
      />

      {/* Search form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="of-url" className="text-[11px] text-slate-500 mb-1 block">
                Company Website URL <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Globe
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  id="of-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://acme.com"
                  className={cn(inputCls, "pl-8")}
                  aria-label="Company website URL"
                />
              </div>
            </div>
            <div>
              <label htmlFor="of-name" className="text-[11px] text-slate-500 mb-1 block">
                Company Name <span className="text-slate-600">(optional)</span>
              </label>
              <div className="relative">
                <Building2
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  id="of-name"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc"
                  className={cn(inputCls, "pl-8")}
                  aria-label="Company name"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Search size={13} /> Find Opportunities
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300"
        >
          <AlertTriangle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Empty prompt */}
      {!report && !loading && !error && (
        <EmptyState
          icon={<Sparkles size={18} />}
          title="Enter a website to find opportunities"
          hint="Paste a company's website URL above and we'll detect gaps and recommend services you can pitch."
        />
      )}

      {/* Loading */}
      {loading && (
        <EmptyState
          icon={<Loader2 size={18} className="animate-spin" />}
          title="Scanning the website…"
          hint="Detecting gaps and building service recommendations."
        />
      )}

      {/* Results */}
      {report && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Hero */}
          <Card className="border-blue-500/20">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  {report.company || "Company"}
                  {report.website ? ` · ${report.website}` : ""}
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                  {report.headline || "Opportunity report"}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatTile
                  label="Opportunity Score"
                  value={`${Number.isFinite(report.opportunityScore) ? Math.round(report.opportunityScore) : 0}/100`}
                  icon={<Gauge size={16} />}
                  tone={scoreTone(report.opportunityScore)}
                />
                <StatTile
                  label="Total Potential Value"
                  value={money(report.totalPotentialValue)}
                  icon={<DollarSign size={16} />}
                  tone="emerald"
                />
              </div>
            </div>
          </Card>

          {/* AI recommendation */}
          {report.aiRecommendation && (
            <Card
              title="Recommendation"
              icon={<Lightbulb size={16} className="text-amber-400" />}
              actions={
                <Badge tone={report.usedAi ? "violet" : "slate"}>
                  {report.usedAi ? (
                    <>
                      <Bot size={9} /> AI
                    </>
                  ) : (
                    "Heuristic"
                  )}
                </Badge>
              }
            >
              <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line">
                {report.aiRecommendation}
              </p>
            </Card>
          )}

          {/* Recommended services */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recommended Services</h3>
              <span className="text-[11px] text-slate-500">({services.length})</span>
            </div>
            {services.length === 0 ? (
              <EmptyState
                icon={<Target size={18} />}
                title="No service recommendations"
                hint="This company shows no clear gaps to pitch against."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((svc, i) => (
                  <motion.div
                    key={svc.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="h-full">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-semibold text-slate-100">{svc.name}</h4>
                        <Badge tone={priorityTone[svc.priority] ?? "slate"}>{svc.priority}</Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400 mb-3">{svc.rationale}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <TrendingUp size={11} /> Est. value
                        </span>
                        <span className="text-base font-bold text-emerald-400">
                          {money(svc.estimatedValue)}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Detected gaps */}
          <Card
            title="Detected Gaps"
            subtitle={`${gaps.length} opportunit${gaps.length === 1 ? "y" : "ies"} found`}
            icon={<AlertTriangle size={16} className="text-amber-400" />}
          >
            {gaps.length === 0 ? (
              <p className="text-xs text-slate-500">No gaps detected — this company looks well covered.</p>
            ) : (
              <ul className="space-y-2">
                {gaps.map((gap) => (
                  <li
                    key={gap.key}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-crm-border/60 bg-white/[0.02]"
                  >
                    <Badge tone={severityTone[gap.severity] ?? "slate"} className="mt-0.5 flex-shrink-0">
                      {gap.severity}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200">{gap.label}</p>
                      {gap.evidence && (
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{gap.evidence}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
