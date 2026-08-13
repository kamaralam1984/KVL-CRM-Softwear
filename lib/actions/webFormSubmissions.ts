"use server";
import { getServerClient } from "@/lib/supabase/server";

// Persists inbound contact-form submissions into `web_form_submissions`
// (see lib/supabase/schema.sql), which lib/leadgen/sources/webForm.ts polls
// to turn into leads. Fail-soft: a persistence error must not block the
// user-facing "message sent" confirmation.
export async function submitWebFormLead(input: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
}): Promise<void> {
  try {
    const db = getServerClient();
    const { error } = await db.from("web_form_submissions").insert({
      name: input.name,
      email: input.email,
      company: input.company ?? "",
      phone: input.phone ?? "",
      message: input.message ?? "",
    });
    if (error) console.error("[contact] web-form submission failed:", error.message);
  } catch (e) {
    console.error("[contact] web-form submission error:", e);
  }
}
