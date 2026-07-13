"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Search,
  Loader2,
  Gauge,
  ShieldCheck,
  Zap,
  Accessibility,
  Sparkles,
  Award,
  Server,
  LayoutGrid,
  AlertTriangle,
  WifiOff,
  ScanSearch,
} from "lucide-react";
import { Card, StatTile, Badge, SectionHeader, EmptyState } from "@/components/ui";
import type { StatTone } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { WebsiteAnalysis } from "@/lib/analyzer/types";

/** Map a 0-100 score to the CRM semantic tone. */
function scoreTone(score: number): StatTone {
  if (score >= 80) return "emerald";
  if (score >= 60) return "amber";
  return "rose";
}

type IssueGroup = {
  label: string;
  issues: string[];
};

const inputCls =
  "w-full bg-white/[0.04] border border-crm-border rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 transition-colors";

export default function WebsiteAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WebsiteAnalysis | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyzer/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`Scan failed (${res.status})`);
      }

      const data = (await res.json()) as WebsiteAnalysis;
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while scanning the site."
      );
    } finally {
      setLoading(false);
    }
  }

  const vitals = result?.performance.coreWebVitals;
  const vitalItems: { label: string; value?: number; unit: string }[] = [
    { label: "LCP", value: vitals?.lcp, unit: "s" },
    { label: "CLS", value: vitals?.cls, unit: "" },
    { label: "FCP", value: vitals?.fcp, unit: "s" },
    { label: "TTFB", value: vitals?.ttfb, unit: "ms" },
  ];

  const issueGroups: IssueGroup[] = result
    ? [
        { label: "SEO", issues: result.seo.issues },
        { label: "Performance", issues: result.performance.issues },
        { label: "Security", issues: result.security.issues },
        { label: "Technology", issues: result.tech.issues },
      ].filter((g) => g.issues.length > 0)
    : [];

  const totalIssues = issueGroups.reduce((sum, g) => sum + g.issues.length, 0);

  return (
    <div className="p-5 h-full overflow-y-auto space-y-4">
      <SectionHeader
        title="Website Analyzer"
        subtitle="Scan any site for SEO, performance, security and technology signals"
      />

      {/* Search form */}
      <Card>
        <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Globe
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
            />
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              aria-label="Website URL to analyze"
              className={cn(inputCls, "pl-9")}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-bg text-white text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </form>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
            <Loader2 size={26} className="animate-spin text-blue-400" />
            <p className="text-sm font-semibold text-slate-300">
              Scanning the site…
            </p>
            <p className="text-[11px] text-slate-500">
              Checking SEO, speed, security headers and detected technologies.
            </p>
          </div>
        </Card>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card>
          <EmptyState
            icon={<AlertTriangle size={18} />}
            title="Couldn't complete the scan"
            hint={error}
          />
        </Card>
      )}

      {/* Empty (initial) state */}
      {!loading && !error && !result && (
        <Card>
          <EmptyState
            icon={<ScanSearch size={18} />}
            title="Enter a URL to get started"
            hint="Paste a website address above and hit Analyze to generate a full opportunity report."
          />
        </Card>
      )}

      {/* Unreachable site */}
      {!loading && result && !result.reachable && (
        <Card>
          <EmptyState
            icon={<WifiOff size={18} />}
            title="We couldn't reach that site"
            hint={`${result.domain} did not respond. Double-check the URL or try again later.`}
          />
        </Card>
      )}

      {/* Results */}
      {!loading && result && result.reachable && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Score tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile
              label={`Overall · Grade ${result.grade}`}
              value={result.overallScore}
              icon={<Award size={16} />}
              tone={scoreTone(result.overallScore)}
            />
            <StatTile
              label="SEO"
              value={result.seo.score}
              icon={<Search size={16} />}
              tone={scoreTone(result.seo.score)}
            />
            <StatTile
              label="Performance"
              value={result.performance.speedScore}
              icon={<Zap size={16} />}
              tone={scoreTone(result.performance.speedScore)}
            />
            <StatTile
              label="Security"
              value={result.security.score}
              icon={<ShieldCheck size={16} />}
              tone={scoreTone(result.security.score)}
            />
            <StatTile
              label="Accessibility"
              value={result.tech.accessibilityScore}
              icon={<Accessibility size={16} />}
              tone={scoreTone(result.tech.accessibilityScore)}
            />
            <StatTile
              label="Opportunity Score"
              value={result.opportunityScore}
              icon={<Sparkles size={16} />}
              tone="violet"
              className="ring-1 ring-violet-500/30"
            />
          </div>

          {/* Summary */}
          <Card
            title="Summary"
            subtitle={result.domain}
            icon={<Sparkles size={16} className="text-violet-400" />}
          >
            <p className="text-sm text-slate-300 leading-relaxed">
              {result.summary}
            </p>
          </Card>

          {/* Tech + Core Web Vitals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card
              title="Technology detected"
              icon={<Server size={16} className="text-blue-400" />}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {result.tech.cms && (
                    <Badge tone="blue">
                      <LayoutGrid size={10} /> {result.tech.cms}
                    </Badge>
                  )}
                  {result.tech.hosting && (
                    <Badge tone="violet">
                      <Server size={10} /> {result.tech.hosting}
                    </Badge>
                  )}
                  {!result.tech.cms && !result.tech.hosting && (
                    <span className="text-[11px] text-slate-500">
                      No CMS or hosting fingerprint identified.
                    </span>
                  )}
                </div>
                {result.tech.technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.tech.technologies.map((t) => (
                      <Badge key={t} tone="slate">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No additional technologies detected.
                  </p>
                )}
              </div>
            </Card>

            <Card
              title="Core Web Vitals"
              subtitle={
                result.performance.usedRealData
                  ? "Field data"
                  : "Estimated (heuristic)"
              }
              icon={<Gauge size={16} className="text-emerald-400" />}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {vitalItems.map((v) => (
                  <div
                    key={v.label}
                    className="glass-card rounded-xl border border-crm-border p-3"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      {v.label}
                    </p>
                    <p className="text-lg font-bold text-slate-100">
                      {v.value !== undefined ? (
                        <>
                          {v.value}
                          <span className="text-xs text-slate-500 ml-0.5">
                            {v.unit}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Issues */}
          <Card
            title="Issues found"
            subtitle={`${totalIssues} across SEO, performance, security and tech`}
            icon={<AlertTriangle size={16} className="text-amber-400" />}
          >
            {totalIssues === 0 ? (
              <EmptyState
                icon={<ShieldCheck size={18} />}
                title="No issues detected"
                hint="This site passed all of the checks we ran."
              />
            ) : (
              <div className="space-y-4">
                {issueGroups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {group.label}
                      </h4>
                      <Badge tone="amber">{group.issues.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {group.issues.map((issue, i) => (
                        <div
                          key={`${group.label}-${i}`}
                          className="flex items-start gap-2 rounded-lg border border-crm-border/50 bg-white/[0.02] px-3 py-2"
                        >
                          <AlertTriangle
                            size={13}
                            className="text-amber-400 mt-0.5 flex-shrink-0"
                          />
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {issue}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
