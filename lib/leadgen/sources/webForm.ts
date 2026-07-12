// Web-form lead source — inbound leads people submitted on your landing page.
// Reads un-processed rows from the `web_form_submissions` Supabase table and
// marks them processed so they aren't pulled again. Highest-quality leads.
//
// Expected table columns: id, name, company, email, phone, message, processed (bool).
// Create it with lib/supabase/schema.sql (see docs) — or the mock runs instead.
//
// The `query` arg is ignored (inbound leads aren't searched, they arrive).

import { getServerClient } from "@/lib/supabase/server";
import type { RawLead } from "../types";

export async function fetchWebFormLeads(_query: string, limit = 20): Promise<RawLead[]> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("web_form_submissions")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[leadgen] web-form read failed, using mock:", error.message);
      return mock(limit);
    }
    if (!data?.length) return [];

    // Mark them processed so the next run doesn't re-pull.
    const ids = data.map((r) => r.id);
    await db.from("web_form_submissions").update({ processed: true }).in("id", ids);

    return data.map((r) => ({
      name: r.name ?? r.company ?? "Website lead",
      company: r.company ?? r.name ?? "Website lead",
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      category: "inbound",
      source: "web_form" as const,
      sourceId: `form-${r.id}`,
      raw: r,
    }));
  } catch (e) {
    console.error("[leadgen] web-form error, using mock:", e);
    return mock(limit);
  }
}

function mock(limit: number): RawLead[] {
  const samples = [
    { name: "Riya Kapoor", company: "Bloom Bakery", email: "riya@bloombakery.in", phone: "+91 9811122233" },
    { name: "Sameer Joshi", company: "FitZone Gym", email: "sameer@fitzone.in", phone: "+91 9822233344" },
    { name: "Tara Menon", company: "Menon Legal", email: "tara@menonlegal.in", phone: "+91 9833344455" },
  ];
  return samples.slice(0, limit).map((s, i) => ({
    ...s,
    category: "inbound",
    source: "web_form" as const,
    sourceId: `mock-form-${i}`,
  }));
}
