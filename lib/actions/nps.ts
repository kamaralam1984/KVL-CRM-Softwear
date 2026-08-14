"use server";
import { getServerClient } from "@/lib/supabase/server";

export type NpsResponse = { name: string; score: number; comment: string; date: string };

// Manually-logged NPS responses (see lib/supabase/schema.sql: customer_nps_responses).
// There is no seed/demo data for this — an empty array is the honest, truthful
// state until someone actually logs a response via submitNpsResponse below.
export async function getNpsResponses(): Promise<NpsResponse[]> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("customer_nps_responses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((r) => ({
      name: (r.customer_name as string) || "Unknown",
      score: r.score as number,
      comment: (r.comment as string) || "",
      date: new Date(r.created_at as string).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));
  } catch (e) {
    console.error("[nps] getNpsResponses error:", e);
    return [];
  }
}

export async function submitNpsResponse(input: {
  customerName: string;
  score: number;
  comment?: string;
}): Promise<void> {
  try {
    const db = getServerClient();
    const { error } = await db.from("customer_nps_responses").insert({
      customer_name: input.customerName,
      score: input.score,
      comment: input.comment ?? "",
    });
    if (error) console.error("[nps] submitNpsResponse failed:", error.message);
  } catch (e) {
    console.error("[nps] submitNpsResponse error:", e);
  }
}
