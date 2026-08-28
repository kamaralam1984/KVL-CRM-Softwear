// Phase 43 — Forms, Surveys & Quiz Builder. Lead source for the new
// `form_submissions` table — mirrors webForm.ts's poll-and-mark-processed
// shape exactly, but reads `answers jsonb` instead of fixed columns since a
// form's fields are arbitrary/staff-defined, not a fixed name/email/company
// shape. Only rows with a usable contact_name/contact_email/contact_phone
// (already extracted at submit time — see lib/actions/forms.ts::submitForm)
// become leads; a submission with no identifiable contact is skipped, not
// faked into a lead with blank fields.

import { getServerClient } from "@/lib/supabase/server";
import type { RawLead } from "../types";

export async function fetchFormSubmissionLeads(_query: string, limit = 20): Promise<RawLead[]> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("form_submissions")
      .select("*, forms(name)")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[leadgen] form-submission read failed, using mock:", error.message);
      return mock(limit);
    }
    if (!data?.length) return [];

    const ids = data.map((r) => r.id);
    await db.from("form_submissions").update({ processed: true }).in("id", ids);

    return data
      .filter((r) => r.contact_name || r.contact_email || r.contact_phone)
      .map((r) => {
        const formName = (r.forms as { name?: string } | null)?.name ?? "Form";
        return {
          name: r.contact_name || r.contact_email || "Form respondent",
          company: formName,
          email: r.contact_email || undefined,
          phone: r.contact_phone || undefined,
          category: "inbound",
          source: "form_submission" as const,
          sourceId: `form-submission-${r.id}`,
          raw: r as Record<string, unknown>,
        };
      });
  } catch (e) {
    console.error("[leadgen] form-submission error, using mock:", e);
    return mock(limit);
  }
}

function mock(limit: number): RawLead[] {
  const samples = [
    { name: "Neha Verma", company: "Quiz respondent", email: "neha.verma@example.com" },
    { name: "Arjun Rao", company: "Survey respondent", email: "arjun.rao@example.com" },
  ];
  return samples.slice(0, limit).map((s, i) => ({
    ...s,
    category: "inbound",
    source: "form_submission" as const,
    sourceId: `mock-form-submission-${i}`,
  }));
}
