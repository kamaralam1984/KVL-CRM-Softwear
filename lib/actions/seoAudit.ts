"use server";
// SEO Suite → "SEO Audit": runs the real Website Analyzer against a URL and returns a checklist.
// Login required (assertCanStrict) and the target must be a public http(s) address, so this can't
// be used as an anonymous scanner or to probe the server's own network.

import { assertCanStrict } from "@/lib/security/requireAction";
import { isSafeWebhookUrl } from "@/lib/security/ssrfGuard";
import { rateLimit } from "@/lib/security/rateLimit";
import { analyzeWebsite } from "@/lib/analyzer";
import { buildAudit, type AuditReport } from "@/lib/analyzer/audit";

export type SeoAuditResult = { ok: true; report: AuditReport } | { ok: false; error: string };

export async function runSeoAudit(rawUrl: string, accessToken?: string): Promise<SeoAuditResult> {
  if (!(await assertCanStrict(accessToken, "marketing", "read"))) {
    return { ok: false, error: "Please sign in with a role that can use Marketing to run an audit." };
  }
  const input = String(rawUrl ?? "").trim();
  if (!input || input.length > 300) return { ok: false, error: "Enter your website address, e.g. example.com" };
  const url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try { new URL(url); } catch { return { ok: false, error: "That doesn't look like a valid website address." }; }
  if (!(await isSafeWebhookUrl(url))) return { ok: false, error: "Enter a public website address (localhost and private addresses can't be audited)." };
  if (!rateLimit("seo-audit", 20, 60_000).allowed) return { ok: false, error: "Too many audits right now — wait a minute and try again." };

  try {
    return { ok: true, report: buildAudit(await analyzeWebsite(url)) };
  } catch (err) {
    console.error("[seo-audit] failed:", err);
    return { ok: false, error: "The audit failed unexpectedly. Try again in a moment." };
  }
}
