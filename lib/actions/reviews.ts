"use server";
// Phase 26 — Reputation Management. CRUD for `reviews`/`review_requests`.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { draftReviewReply, templateReviewReply } from "@/lib/reputation/aiReply";
import { sendWhatsApp, sendSms, isWhatsAppConfigured } from "@/lib/messaging/send";

export type Review = {
  id: string;
  site_id: string;
  source: string;
  author_name: string;
  rating: number;
  review_text: string;
  reply_text: string;
  reply_status: "none" | "draft" | "posted";
  reviewed_at: string | null;
  created_at: string;
};

export async function getReviews(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<Review[]> {
  if (!(await assertCan(accessToken, "helpdesk", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("reviews")
      .select("*")
      .eq("site_id", siteId)
      .order("reviewed_at", { ascending: false, nullsFirst: false });
    if (error) { console.error("[reputation] getReviews failed:", error.message); return []; }
    return (data ?? []) as Review[];
  } catch (err) {
    console.error("[reputation] getReviews error:", err);
    return [];
  }
}

// "Draft Reply" button — AI when configured, template otherwise. Always
// saves as reply_status="draft" — never auto-posts (human approves next).
export async function generateReviewReplyDraft(reviewId: string, accessToken?: string): Promise<{ ok: boolean; reply?: string }> {
  if (!(await assertCan(accessToken, "helpdesk", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { data: review, error: fetchErr } = await db.from("reviews").select("*").eq("id", reviewId).single();
    if (fetchErr || !review) return { ok: false };

    const reply =
      (await draftReviewReply({ authorName: review.author_name, rating: review.rating, reviewText: review.review_text })) ??
      templateReviewReply({ authorName: review.author_name, rating: review.rating });

    const { error } = await db.from("reviews").update({ reply_text: reply, reply_status: "draft" }).eq("id", reviewId);
    if (error) { console.error("[reputation] generateReviewReplyDraft save failed:", error.message); return { ok: false }; }
    return { ok: true, reply };
  } catch (err) {
    console.error("[reputation] generateReviewReplyDraft error:", err);
    return { ok: false };
  }
}

// "Approve & Post" — a human edits the draft in the UI, this saves the final
// text and marks it posted. Actually posting back to Google requires the
// Business Profile write scope + a real connection; until then this records
// the approved reply as the CRM's own record of what was sent, matching the
// "real when configured, otherwise the honest local record" convention.
export async function approveReviewReply(reviewId: string, finalText: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "helpdesk", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("reviews").update({ reply_text: finalText, reply_status: "posted" }).eq("id", reviewId);
    if (error) { console.error("[reputation] approveReviewReply failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[reputation] approveReviewReply error:", err);
    return { ok: false };
  }
}

// Extends lib/outreach with a "job completed → review request" trigger,
// reusing Phase 21's real WhatsApp/SMS send rather than building a new
// channel. Called from the Reputation section (or a future automation node).
// customerId is nullable — the review_requests.customer_id column allows it
// (`on delete set null`) for the case of a one-off request not tied to an
// existing customer record.
export async function sendReviewRequest(
  customerId: number | null,
  phone: string,
  reviewLink: string,
  accessToken?: string,
): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "helpdesk", "create"))) return { ok: false };
  if (!phone) return { ok: false };

  const message = `Thanks for being a customer! We'd love a quick review: ${reviewLink}`;
  const result = isWhatsAppConfigured() ? await sendWhatsApp(phone, message) : await sendSms(phone, message, "review_request");

  try {
    const db = getServerClient();
    await db.from("review_requests").insert({
      customer_id: customerId,
      channel: isWhatsAppConfigured() ? "whatsapp" : "sms",
      status: result.ok ? "sent" : "failed",
    });
  } catch (err) {
    console.error("[reputation] sendReviewRequest record failed:", err);
  }
  return { ok: result.ok };
}
