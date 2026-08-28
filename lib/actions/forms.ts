"use server";
// Phase 43 — Forms, Surveys & Quiz Builder. CRUD for `forms` +
// public-facing `submitForm()` for the render route.

import { headers } from "next/headers";
import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { rateLimit } from "@/lib/security/rateLimit";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { computeScore, matchScoreBand, type FormField, type ScoreBand } from "@/lib/forms/fields";

// Gap-check fix — submitForm is a genuinely public, unauthenticated write
// path (anyone can call this Server Action directly and repeatedly). Every
// other public write path in this codebase rate-limits by IP (e.g.
// app/api/webchat/message, app/api/analytics/collect); this one had none.
// Server Actions don't receive a NextRequest, so the client IP comes from
// next/headers instead of app/api/analytics/shared.ts's clientIp(req).
async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

// Same truncation discipline app/api/analytics/shared.ts's str() already
// uses elsewhere — bounds an otherwise-arbitrary user-supplied answers blob
// so a submission can't smuggle in a multi-megabyte payload.
const MAX_ANSWER_LENGTH = 2000;
const MAX_FIELDS_PER_SUBMISSION = 100;

function sanitizeAnswers(answers: Record<string, string | string[]>): Record<string, string | string[]> {
  const clean: Record<string, string | string[]> = {};
  let count = 0;
  for (const [key, value] of Object.entries(answers)) {
    if (count >= MAX_FIELDS_PER_SUBMISSION) break;
    count++;
    if (Array.isArray(value)) {
      clean[key] = value.slice(0, 50).map((v) => String(v).slice(0, MAX_ANSWER_LENGTH));
    } else {
      clean[key] = String(value ?? "").slice(0, MAX_ANSWER_LENGTH);
    }
  }
  return clean;
}

export type FormKind = "form" | "survey" | "quiz";

export type FormRow = {
  id: string;
  site_id: string;
  slug: string;
  name: string;
  kind: FormKind;
  fields: FormField[];
  scoring_rules: ScoreBand[];
  published: boolean;
  created_at: string;
};

export async function getForms(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<FormRow[]> {
  if (!(await assertCan(accessToken, "funnels", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("forms").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
    if (error) { console.error("[forms] getForms failed:", error.message); return []; }
    return (data ?? []) as FormRow[];
  } catch (err) {
    console.error("[forms] getForms error:", err);
    return [];
  }
}

// Public — used by the render route, no RBAC (same trust model as
// lib/actions/pages.ts::getPageBySlug).
export async function getFormBySlug(slug: string, siteId = DEFAULT_SITE_ID): Promise<FormRow | null> {
  try {
    const db = getServerClient();
    const { data, error } = await db.from("forms").select("*").eq("site_id", siteId).eq("slug", slug).eq("published", true).maybeSingle();
    if (error || !data) return null;
    return data as FormRow;
  } catch (err) {
    console.error("[forms] getFormBySlug failed:", err);
    return null;
  }
}

export async function saveForm(
  input: { id?: string; name: string; slug: string; kind: FormKind; fields: FormField[]; scoringRules: ScoreBand[]; siteId?: string },
  accessToken?: string,
): Promise<FormRow | null> {
  if (!(await assertCan(accessToken, "funnels", input.id ? "update" : "create"))) return null;
  const siteId = input.siteId ?? DEFAULT_SITE_ID;

  try {
    const db = getServerClient();
    if (input.id) {
      const { data, error } = await db
        .from("forms")
        .update({ name: input.name, kind: input.kind, fields: input.fields, scoring_rules: input.scoringRules })
        .eq("id", input.id)
        .select()
        .single();
      if (error) { console.error("[forms] saveForm update failed:", error.message); return null; }
      return data as FormRow;
    }
    const { data, error } = await db
      .from("forms")
      .upsert(
        { site_id: siteId, slug: input.slug, name: input.name, kind: input.kind, fields: input.fields, scoring_rules: input.scoringRules, published: false },
        { onConflict: "site_id,slug" },
      )
      .select()
      .single();
    if (error) { console.error("[forms] saveForm insert failed:", error.message); return null; }
    return data as FormRow;
  } catch (err) {
    console.error("[forms] saveForm error:", err);
    return null;
  }
}

export async function publishForm(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "funnels", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("forms").update({ published: true }).eq("id", id);
    if (error) { console.error("[forms] publishForm failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[forms] publishForm error:", err);
    return { ok: false };
  }
}

export async function deleteForm(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "funnels", "delete"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("forms").delete().eq("id", id);
    if (error) { console.error("[forms] deleteForm failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[forms] deleteForm error:", err);
    return { ok: false };
  }
}

// Public — called by the render route on submit. Computes a score for
// quiz-kind forms and returns the matching outcome band, if any.
export async function submitForm(
  formId: string,
  rawAnswers: Record<string, string | string[]>,
): Promise<{ ok: boolean; computedScore?: number; outcome?: ScoreBand | null }> {
  try {
    const ip = await clientIpFromHeaders();
    const limit = rateLimit(`forms:submit:${ip}`, 20, 60_000);
    if (!limit.allowed) return { ok: false };

    const answers = sanitizeAnswers(rawAnswers);

    const db = getServerClient();
    const { data: form, error: formErr } = await db.from("forms").select("*").eq("id", formId).eq("published", true).maybeSingle();
    if (formErr || !form) return { ok: false };

    const fields = form.fields as FormField[];
    const isQuiz = form.kind === "quiz";
    const computedScore = isQuiz ? computeScore(fields, answers) : undefined;
    const outcome = isQuiz ? matchScoreBand(form.scoring_rules as ScoreBand[], computedScore ?? 0) : undefined;

    const nameField = fields.find((f) => /name/i.test(f.label));
    const emailField = fields.find((f) => f.type === "email");
    const phoneField = fields.find((f) => f.type === "phone");
    const contactName = nameField ? String(answers[nameField.id] ?? "") : "";
    const contactEmail = emailField ? String(answers[emailField.id] ?? "") : "";
    const contactPhone = phoneField ? String(answers[phoneField.id] ?? "") : "";

    const { error } = await db.from("form_submissions").insert({
      form_id: formId,
      answers,
      computed_score: computedScore ?? null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    });
    if (error) { console.error("[forms] submitForm insert failed:", error.message); return { ok: false }; }

    return { ok: true, computedScore, outcome: outcome ?? null };
  } catch (err) {
    console.error("[forms] submitForm error:", err);
    return { ok: false };
  }
}
