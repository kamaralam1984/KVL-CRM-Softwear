// Phase 3 — AI Opportunity Engine: gap detection.
// Consumes a Phase-2 WebsiteAnalysis (optional) + Phase-1 enriched RawLead and
// returns an OpportunityGap for each of the 11 signals we look for. `missing`
// is set true when the thing is absent (i.e. it's a sellable opportunity).
// This function is pure and NEVER throws — it degrades gracefully when the
// analysis scan is missing.

import type { GapKey, OpportunityGap } from "./types";
import type { WebsiteAnalysis } from "@/lib/analyzer/types";
import type { RawLead } from "@/lib/leadgen/types";

type Severity = OpportunityGap["severity"];

// Build a single lowercase haystack of every tech/signal string we can find,
// merging Phase-2 tech detection with Phase-1 lead enrichment + the URL itself.
function buildSignals(analysis: WebsiteAnalysis | undefined, lead: RawLead): string {
  const parts: string[] = [];
  try {
    if (analysis) {
      const t = analysis.tech;
      if (t) {
        if (t.cms) parts.push(t.cms);
        if (t.hosting) parts.push(t.hosting);
        if (Array.isArray(t.technologies)) parts.push(...t.technologies);
      }
      if (analysis.url) parts.push(analysis.url);
      if (analysis.domain) parts.push(analysis.domain);
    }
    if (Array.isArray(lead.techStack)) parts.push(...lead.techStack);
    if (lead.website) parts.push(lead.website);
    const s = lead.socialLinks;
    if (s) {
      for (const v of Object.values(s)) if (typeof v === "string") parts.push(v);
    }
    if (lead.raw) {
      try {
        parts.push(JSON.stringify(lead.raw));
      } catch {
        /* ignore non-serializable raw */
      }
    }
  } catch {
    /* never throw */
  }
  return parts.filter(Boolean).join(" | ").toLowerCase();
}

function has(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n.toLowerCase()));
}

function gap(
  key: GapKey,
  label: string,
  missing: boolean,
  severity: Severity,
  evidence: string,
): OpportunityGap {
  return { key, label, missing, severity, evidence };
}

const NO_SCAN = "no scan available";

export function detectGaps(
  analysis: WebsiteAnalysis | undefined,
  lead: RawLead,
): OpportunityGap[] {
  const gaps: OpportunityGap[] = [];

  try {
    const sig = buildSignals(analysis, lead);
    const employees = typeof lead.employeeCount === "number" ? lead.employeeCount : 0;
    const larger = employees >= 50;

    // --- old_website ------------------------------------------------------
    {
      const legacyCms = ["wordpress", "wix", "godaddy", "joomla", "squarespace", "weebly"];
      const modernFw = ["react", "next", "nextjs", "next.js", "vue", "nuxt", "svelte", "angular", "gatsby", "remix", "astro"];
      const cms = analysis?.tech?.cms?.toLowerCase() ?? "";
      const hasLegacy = has(sig, legacyCms) || legacyCms.some((c) => cms.includes(c));
      const perf = analysis?.performance;
      const poorPerf =
        !!perf &&
        ((typeof perf.speedScore === "number" && perf.speedScore < 60) ||
          (typeof perf.mobileScore === "number" && perf.mobileScore < 60) ||
          perf.mobileFriendly === false);
      const hasModern = analysis ? has(sig, modernFw) : false;
      const noModern = !!analysis && !hasModern;

      if (!analysis) {
        gaps.push(
          gap("old_website", "Website may be outdated", true, "low", NO_SCAN),
        );
      } else {
        const missing = hasLegacy || poorPerf || noModern;
        const severity: Severity = hasLegacy && poorPerf ? "high" : hasLegacy || poorPerf ? "medium" : "low";
        const why: string[] = [];
        if (hasLegacy) why.push(`legacy platform detected${cms ? ` (${analysis.tech.cms})` : ""}`);
        if (poorPerf) why.push("poor performance/mobile scores");
        if (noModern) why.push("no modern framework detected");
        gaps.push(
          gap(
            "old_website",
            "Website is outdated",
            missing,
            missing ? severity : "low",
            missing ? why.join("; ") : "modern stack with good performance",
          ),
        );
      }
    }

    // --- no_crm -----------------------------------------------------------
    {
      const crm = ["hubspot", "salesforce", "zoho", "pipedrive", "freshsales", "dynamics 365", "sugarcrm"];
      const found = has(sig, crm);
      gaps.push(
        gap(
          "no_crm",
          "No CRM detected",
          !found,
          larger ? "high" : "medium",
          found ? "CRM tech detected in stack" : analysis ? "no CRM tech in detected stack" : NO_SCAN,
        ),
      );
    }

    // --- no_erp -----------------------------------------------------------
    {
      const erp = ["sap", "oracle erp", "netsuite", "odoo", "microsoft dynamics", "dynamics 365", "workday", "tally", "erpnext"];
      const found = has(sig, erp);
      gaps.push(
        gap(
          "no_erp",
          "No ERP detected",
          !found,
          larger ? "high" : "low",
          found
            ? "ERP tech detected in stack"
            : `no ERP tech detected${larger ? ` (${employees}+ employees suggests need)` : ""}`,
        ),
      );
    }

    // --- no_mobile_app ----------------------------------------------------
    {
      const appSignals = [
        "apps.apple.com",
        "itunes.apple.com",
        "play.google.com",
        "app store",
        "google play",
        "react native",
        "flutter",
        "ionic",
        "expo",
        "swift",
        "kotlin",
      ];
      const found = has(sig, appSignals);
      gaps.push(
        gap(
          "no_mobile_app",
          "No mobile app detected",
          !found,
          larger ? "medium" : "low",
          found ? "app-store link or mobile framework detected" : "no app-store links or mobile framework signals",
        ),
      );
    }

    // --- poor_seo ---------------------------------------------------------
    {
      const score = analysis?.seo?.score;
      if (typeof score !== "number") {
        gaps.push(gap("poor_seo", "SEO not evaluated", true, "low", NO_SCAN));
      } else {
        const missing = score < 70;
        gaps.push(
          gap(
            "poor_seo",
            "Poor SEO",
            missing,
            score < 50 ? "high" : missing ? "medium" : "low",
            `SEO score ${score}/100`,
          ),
        );
      }
    }

    // --- no_whatsapp ------------------------------------------------------
    {
      const wa = ["whatsapp", "wa.me", "api.whatsapp.com", "click-to-chat", "click to chat"];
      const found = has(sig, wa);
      gaps.push(
        gap(
          "no_whatsapp",
          "No WhatsApp channel",
          !found,
          "medium",
          found ? "WhatsApp link/click-to-chat detected" : "no WhatsApp link or click-to-chat signal",
        ),
      );
    }

    // --- no_chatbot -------------------------------------------------------
    {
      const chat = ["intercom", "drift", "tawk", "crisp", "zendesk chat", "livechat", "freshchat", "tidio"];
      const found = has(sig, chat);
      gaps.push(
        gap(
          "no_chatbot",
          "No chat widget",
          !found,
          "low",
          found ? "chat widget tech detected" : analysis ? "no chat widget tech detected" : NO_SCAN,
        ),
      );
    }

    // --- no_booking -------------------------------------------------------
    {
      const booking = ["calendly", "acuity", "cal.com", "setmore", "simplybook", "bookingkoala"];
      const found = has(sig, booking);
      gaps.push(
        gap(
          "no_booking",
          "No online booking",
          !found,
          "low",
          found ? "booking tech detected" : analysis ? "no booking tech detected" : NO_SCAN,
        ),
      );
    }

    // --- no_online_payment ------------------------------------------------
    {
      const pay = ["stripe", "razorpay", "paypal", "square", "braintree", "paytm", "payu", "adyen"];
      const found = has(sig, pay);
      gaps.push(
        gap(
          "no_online_payment",
          "No online payments",
          !found,
          "medium",
          found ? "payment tech detected" : analysis ? "no payment tech detected" : NO_SCAN,
        ),
      );
    }

    // --- no_analytics -----------------------------------------------------
    {
      const analytics = [
        "google analytics",
        "gtag",
        "googletagmanager",
        "google tag manager",
        "gtm",
        "analytics.js",
        "ga4",
        "plausible",
        "fathom",
        "matomo",
        "mixpanel",
        "segment",
      ];
      const found = has(sig, analytics);
      gaps.push(
        gap(
          "no_analytics",
          "No analytics",
          !found,
          "medium",
          found ? "analytics tag detected" : analysis ? "no analytics/GTM detected" : NO_SCAN,
        ),
      );
    }

    // --- no_security_headers ----------------------------------------------
    {
      const sec = analysis?.security;
      if (!sec) {
        gaps.push(
          gap("no_security_headers", "Security headers unknown", true, "low", NO_SCAN),
        );
      } else {
        const missingHeaders = Array.isArray(sec.missingHeaders) ? sec.missingHeaders : [];
        const score = typeof sec.score === "number" ? sec.score : 100;
        const missing = missingHeaders.length > 0 || score < 70;
        gaps.push(
          gap(
            "no_security_headers",
            "Missing security headers",
            missing,
            score < 50 ? "high" : missing ? "medium" : "low",
            missing
              ? `${missingHeaders.length ? `missing: ${missingHeaders.join(", ")}` : ""}${
                  missingHeaders.length && score < 70 ? "; " : ""
                }${score < 70 ? `security score ${score}/100` : ""}`
              : "security headers present",
          ),
        );
      }
    }
  } catch {
    // Never throw — return whatever we accumulated.
  }

  return gaps;
}
