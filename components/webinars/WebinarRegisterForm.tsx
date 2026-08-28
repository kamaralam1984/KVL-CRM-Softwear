"use client";
// Phase 45 — Webinar Funnels. Mirrors components/forms/FormRenderer.tsx's
// shape (local state, submit → server action, redirect on success).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerForWebinar } from "@/lib/actions/webinars";

export default function WebinarRegisterForm({ webinarId, slug }: { webinarId: string; slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@")) { setError("Enter your name and a valid email."); return; }
    setSubmitting(true);
    setError("");
    const result = await registerForWebinar(webinarId, { name, email, phone });
    setSubmitting(false);
    if (!result.ok || !result.registrationId) { setError("Could not register — please try again."); return; }
    router.push(`/webinar/${slug}/room?r=${result.registrationId}`);
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm mx-auto">
      <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
        className="w-full h-11 rounded-xl px-4 text-sm border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full h-11 rounded-xl px-4 text-sm border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
      <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
        className="w-full h-11 rounded-xl px-4 text-sm border outline-none" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
      {error && <p className="text-xs" style={{ color: "#B91C1C" }}>{error}</p>}
      <button type="submit" disabled={submitting}
        className="w-full h-11 rounded-xl font-semibold text-sm disabled:opacity-50"
        style={{ background: "#D4AF37", color: "#000" }}>
        {submitting ? "Registering…" : "Save My Seat"}
      </button>
    </form>
  );
}
