// Phase 45 — Webinar Funnels. Lead source for `webinar_registrations` —
// mirrors formSubmission.ts's poll-and-mark-processed shape exactly.

import { getServerClient } from "@/lib/supabase/server";
import type { RawLead } from "../types";

export async function fetchWebinarRegistrationLeads(_query: string, limit = 20): Promise<RawLead[]> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("webinar_registrations")
      .select("*, webinars(title)")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[leadgen] webinar-registration read failed, using mock:", error.message);
      return mock(limit);
    }
    if (!data?.length) return [];

    const ids = data.map((r) => r.id);
    await db.from("webinar_registrations").update({ processed: true }).in("id", ids);

    return data
      .filter((r) => r.name || r.email || r.phone)
      .map((r) => {
        const webinarTitle = (r.webinars as { title?: string } | null)?.title ?? "Webinar";
        return {
          name: r.name || r.email || "Webinar registrant",
          company: webinarTitle,
          email: r.email || undefined,
          phone: r.phone || undefined,
          category: "inbound",
          source: "webinar_registration" as const,
          sourceId: `webinar-registration-${r.id}`,
          raw: r as Record<string, unknown>,
        };
      });
  } catch (e) {
    console.error("[leadgen] webinar-registration error, using mock:", e);
    return mock(limit);
  }
}

function mock(limit: number): RawLead[] {
  const samples = [
    { name: "Kabir Mehta", company: "Webinar registrant", email: "kabir.mehta@example.com" },
    { name: "Ishita Sen", company: "Webinar registrant", email: "ishita.sen@example.com" },
  ];
  return samples.slice(0, limit).map((s, i) => ({
    ...s,
    category: "inbound",
    source: "webinar_registration" as const,
    sourceId: `mock-webinar-registration-${i}`,
  }));
}
