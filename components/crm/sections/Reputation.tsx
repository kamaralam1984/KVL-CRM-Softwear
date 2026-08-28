"use client";
// Phase 26 — Reputation Management. New section (previously didn't exist).
// Real from day one: no external key gate on the CRUD itself, only on the
// Google Business review-pull/AI-reply pieces — matches the "first-party
// feature is always real, external integration degrades gracefully" split
// already used by Phase 23's live-chat widget.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, Sparkles, Check, ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReviews, generateReviewReplyDraft, approveReviewReply, sendReviewRequest, type Review } from "@/lib/actions/reviews";
import { getGoogleBusinessConnectUrl } from "@/lib/reputation/googleBusiness";
import { getConnectedProviders, disconnectProvider } from "@/lib/actions/integrations";
import { getAccessToken } from "@/lib/security/clientSession";

const GOLD = "#D4AF37";
const EMERALD = "#00A86B";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} fill={n <= rating ? GOLD : "none"} style={{ color: n <= rating ? GOLD : "#475569" }} />
      ))}
    </div>
  );
}

function ReviewCard({ review, onUpdate }: { review: Review; onUpdate: (r: Review) => void }) {
  const [drafting, setDrafting] = useState(false);
  const [editText, setEditText] = useState(review.reply_text);
  const [saving, setSaving] = useState(false);

  const draftReply = async () => {
    setDrafting(true);
    const res = await generateReviewReplyDraft(review.id, getAccessToken());
    setDrafting(false);
    if (res.ok && res.reply) {
      setEditText(res.reply);
      onUpdate({ ...review, reply_text: res.reply, reply_status: "draft" });
    }
  };

  const approve = async () => {
    setSaving(true);
    const res = await approveReviewReply(review.id, editText, getAccessToken());
    setSaving(false);
    if (res.ok) onUpdate({ ...review, reply_text: editText, reply_status: "posted" });
  };

  return (
    <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">{review.author_name || "Anonymous"}</span>
          <Stars rating={review.rating} />
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
          review.reply_status === "posted" ? "bg-emerald-500/10 text-emerald-400" :
          review.reply_status === "draft" ? "bg-amber-500/10 text-amber-400" : "bg-slate-500/10 text-slate-500")}>
          {review.reply_status === "posted" ? "Replied" : review.reply_status === "draft" ? "Draft ready" : "Needs reply"}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{review.review_text}</p>

      {review.reply_status !== "posted" ? (
        <div className="space-y-2">
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2}
            placeholder="Write or generate a reply…"
            className="w-full bg-transparent border rounded-lg p-2 text-xs text-slate-300 resize-none outline-none focus:border-amber-500/40"
            style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <div className="flex gap-2">
            <button onClick={draftReply} disabled={drafting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
              style={{ background: "rgba(212,175,55,0.12)", color: GOLD, border: `1px solid ${GOLD}40` }}>
              <Sparkles size={11} /> {drafting ? "Generating…" : "AI Draft"}
            </button>
            <button onClick={approve} disabled={!editText.trim() || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${EMERALD},#007a4d)`, color: "#fff" }}>
              <Check size={11} /> Approve & Post
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg p-2.5 text-xs text-slate-300" style={{ background: "rgba(0,168,107,0.06)", border: "1px solid rgba(0,168,107,0.15)" }}>
          <MessageSquare size={11} className="inline mr-1.5" style={{ color: EMERALD }} />
          {review.reply_text}
        </div>
      )}
    </div>
  );
}

// Gap-check fix: sendReviewRequest existed in lib/actions/reviews.ts but had
// no UI calling it anywhere. This is a minimal, self-contained sender — no
// customer picker (that lives in the Customers section) — a one-off phone +
// review-link send, matching the "job completed → ask for a review" use case.
function RequestReviewCard() {
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!phone.trim() || !link.trim()) return;
    setSending(true);
    const res = await sendReviewRequest(null, phone, link, getAccessToken());
    setSending(false);
    if (res.ok) { setSent(true); setPhone(""); setTimeout(() => setSent(false), 2500); }
  };

  return (
    <div className="rounded-xl border p-4 flex items-end gap-3 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex-1 min-w-[140px]">
        <p className="text-[10px] text-slate-500 mb-1">Customer Phone</p>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919812345678"
          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-crm-border text-xs text-slate-200 outline-none" />
      </div>
      <div className="flex-1 min-w-[140px]">
        <p className="text-[10px] text-slate-500 mb-1">Review Link</p>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://g.page/r/..."
          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-crm-border text-xs text-slate-200 outline-none" />
      </div>
      <button onClick={send} disabled={sending || !phone.trim() || !link.trim()}
        className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
        style={{ background: sent ? EMERALD : GOLD, color: sent ? "#fff" : "#000" }}>
        {sending ? "Sending…" : sent ? "Sent!" : "Send Review Request"}
      </button>
    </div>
  );
}

export default function Reputation() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    getReviews(undefined, token).then((rows) => { setReviews(rows); setLoaded(true); }).catch(() => setLoaded(true));
    getConnectedProviders(token).then((p) => setConnected(p.includes("google_business"))).catch(() => {});
  }, []);

  const connectGoogle = async () => {
    const res = await getGoogleBusinessConnectUrl(window.location.origin);
    if (res.configured && res.url) window.location.href = res.url;
  };

  const disconnectGoogle = async () => {
    await disconnectProvider("google_business", getAccessToken());
    setConnected(false);
  };

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const needsReply = reviews.filter((r) => r.reply_status === "none").length;
  const replyRate = reviews.length ? Math.round((reviews.filter((r) => r.reply_status === "posted").length / reviews.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD + "20", border: `1px solid ${GOLD}33` }}>
            <Star size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Reputation</h1>
            <p className="text-[10px] text-slate-500">Reviews, AI-drafted replies, and review requests</p>
          </div>
        </div>
        {connected ? (
          <button onClick={disconnectGoogle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
            style={{ borderColor: "rgba(0,168,107,0.3)", color: EMERALD, background: "rgba(0,168,107,0.08)" }}>
            <Check size={12} /> Google Business Connected
          </button>
        ) : (
          <button onClick={connectGoogle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black"
            style={{ background: `linear-gradient(135deg,${GOLD},#F5C842)` }}>
            <Globe size={12} /> Connect Google Business <ExternalLink size={10} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Average Rating", val: avgRating, color: GOLD },
            { label: "Needs Reply", val: String(needsReply), color: needsReply > 0 ? "#ef4444" : EMERALD },
            { label: "Reply Rate", val: `${replyRate}%`, color: EMERALD },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-3 border border-crm-border text-center">
              <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <RequestReviewCard />

        {loaded && reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-slate-600">
            <Star size={28} className="mb-2 opacity-40" />
            <p className="text-xs">No reviews yet. Connect Google Business above to start pulling reviews in.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <ReviewCard review={r} onUpdate={(updated) => setReviews((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
