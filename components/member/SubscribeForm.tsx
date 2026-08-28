"use client";
// Phase 29 (gap-check fix) — app/member/[tierId]'s Subscribe CTA previously
// linked to a non-existent static page and never called any real subscribe
// function. This form actually calls lib/actions/membership.ts::subscribeToMembership.

import { useState } from "react";
import { subscribeToMembership } from "@/lib/actions/membership";

export default function SubscribeForm({ tierId }: { tierId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.includes("@")) { setError("Enter your name and a valid email."); return; }
    setLoading(true);
    const result = await subscribeToMembership(tierId, { name, email, phone });
    setLoading(false);
    if (!result.ok) { setError("Could not start your subscription. Please try again."); return; }
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    } else {
      setCheckoutUrl("done");
    }
  };

  if (checkoutUrl) {
    return <p className="text-sm font-semibold" style={{ color: "#0B6E4F" }}>You&apos;re subscribed! Refresh this page to see your content.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-2 max-w-sm mx-auto">
      <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
        className="w-full h-9 rounded-xl px-3 text-sm border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full h-9 rounded-xl px-3 text-sm border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
      <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
        className="w-full h-9 rounded-xl px-3 text-sm border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
      {error && <p className="text-xs" style={{ color: "#B5482B" }}>{error}</p>}
      <button type="submit" disabled={loading} className="w-full h-10 rounded-xl font-black text-sm disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)", color: "#000" }}>
        {loading ? "Starting…" : "Subscribe"}
      </button>
    </form>
  );
}
