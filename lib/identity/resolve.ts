// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 3 (Identity Resolution)
// Merges an anonymous visitor's history into a CRM Lead once they voluntarily
// identify themselves (spec §7). Dedupes against existing leads by verified
// phone first, then email (spec §24) — never creates a duplicate lead for the
// same person. Fails soft throughout: an identity-resolution failure must
// never break the /api/analytics/identify request.

import { getServerClient } from "@/lib/supabase/server";
import { getVisitorAttribution } from "@/lib/tracking/store";
import { createLead } from "@/lib/actions/leads";
import { triggerLeadCreated } from "@/lib/automation/engine";
import type { IdentityResolution } from "./types";

function log(where: string, err: unknown) {
  console.error(`[identity] ${where} failed`, err);
}

// Exported (Wave 8) so these pure helpers are directly unit-testable.
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^0-9]/g, "");
}

/** Spec §19: "IF lead_created AND source = Meta THEN Tag 'Meta Lead'" — generalized. */
export function sourceTag(source: string): string | null {
  const s = source.toLowerCase();
  if (s.includes("facebook") || s.includes("meta") || s.includes("instagram")) return "Meta Lead";
  if (s.includes("google")) return "Google Lead";
  return null;
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?"
  );
}

export async function resolveIdentity(
  input: {
    visitorId: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
  },
  siteId: string
): Promise<IdentityResolution | null> {
  const email = input.email.trim();
  const phone = normalizePhone(input.phone);
  if (!email && !phone) return null; // name alone isn't enough to create/merge a lead

  try {
    const db = getServerClient();

    // Idempotent: a visitor already resolved to a lead stays resolved to it.
    // Scoped by site_id too (gap-check hardening) — a visitor_id presented by
    // a different site than the one that originally created this link must
    // not short-circuit into returning another site's lead id.
    const { data: existingLink } = await db
      .from("visitor_identity_links")
      .select("lead_id, matched_on")
      .eq("visitor_id", input.visitorId)
      .eq("site_id", siteId)
      .maybeSingle();
    if (existingLink) {
      return { leadId: existingLink.lead_id as number, matchedOn: existingLink.matched_on };
    }

    let leadId: number | null = null;
    let matchedOn: "phone" | "email" | "new" = "new";

    // Wave 10 — scoped to site_id: two different sites' customers sharing a
    // phone/email must never silently merge into one lead. Matching is
    // deliberately restricted to leads already tagged with this same site
    // (manually-created/legacy leads default to 'kvl-default' too, so this
    // stays exactly backward-compatible for the bootstrap site).
    if (phone) {
      const { data } = await db.from("leads").select("id").eq("site_id", siteId).eq("phone", phone).maybeSingle();
      if (data) {
        leadId = data.id as number;
        matchedOn = "phone";
      }
    }
    if (!leadId && email) {
      const { data } = await db.from("leads").select("id").eq("site_id", siteId).ilike("email", email).maybeSingle();
      if (data) {
        leadId = data.id as number;
        matchedOn = "email";
      }
    }

    if (!leadId) {
      const attribution = (await getVisitorAttribution(input.visitorId, siteId)) ?? { source: "", campaign: "" };
      const name = input.name.trim() || email || phone;
      const extraTag = sourceTag(attribution.source);
      const tags = extraTag ? ["Acquisition Engine", extraTag] : ["Acquisition Engine"];
      const owner = "Unassigned";
      const score = 50;
      const created = await createLead({
        name,
        company: input.company?.trim() || "",
        email,
        phone: input.phone.trim(),
        score,
        status: "warm",
        stage: "Discovery",
        value: 0,
        owner,
        avatar: initials(name),
        last_contact: "Just now",
        tags,
        source: attribution.source,
        campaign: attribution.campaign,
        visitor_id: input.visitorId,
        site_id: siteId,
      });
      leadId = created.id;
      matchedOn = "new";

      // Reuse the existing Lead Nurture automation (spec §19: form_submitted → create
      // lead, assign owner, create follow-up task) — no separate workflow needed.
      triggerLeadCreated({ name, company: input.company?.trim() || "", score, owner });
    }

    await db.from("visitor_identity_links").insert({
      visitor_id: input.visitorId,
      site_id: siteId,
      lead_id: leadId,
      matched_on: matchedOn,
    });

    return { leadId, matchedOn };
  } catch (err) {
    log("resolveIdentity", err);
    return null;
  }
}
