"use client";
// Phase 43 — Forms, Surveys & Quiz Builder. Client-side renderer for the
// public route (app/forms/[slug]/page.tsx), mirroring components/member/
// SubscribeForm.tsx's shape (local state, submit → server action, show a
// result). Renders any field list generically — no hardcoded field names,
// unlike the old Phase-24 FormBlock this deliberately doesn't reuse.

import { useState } from "react";
import { submitForm } from "@/lib/actions/forms";
import type { FormField, ScoreBand } from "@/lib/forms/fields";

export default function FormRenderer({
  formId,
  fields,
  kind,
}: {
  formId: string;
  fields: FormField[];
  kind: "form" | "survey" | "quiz";
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ computedScore?: number; outcome?: ScoreBand | null } | null>(null);

  const setAnswer = (fieldId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setError("");
  };

  const toggleCheckbox = (fieldId: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [fieldId]: next };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required) {
        const val = answers[f.id];
        const empty = Array.isArray(val) ? val.length === 0 : !val?.trim();
        if (empty) { setError(`Please fill in "${f.label}".`); return; }
      }
    }
    setSubmitting(true);
    const res = await submitForm(formId, answers);
    setSubmitting(false);
    if (!res.ok) { setError("Something went wrong — please try again."); return; }
    setResult({ computedScore: res.computedScore, outcome: res.outcome });
  };

  if (result) {
    if (kind === "quiz" && result.outcome) {
      return (
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">{result.outcome.outcomeTitle}</h2>
          <p className="text-sm opacity-80">{result.outcome.outcomeText}</p>
        </div>
      );
    }
    return <p className="text-sm font-semibold text-center" style={{ color: "#0B6E4F" }}>Thank you — your response has been recorded.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md mx-auto">
      {fields.map((f) => (
        <div key={f.id}>
          <label className="block text-sm font-medium mb-1">
            {f.label}{f.required && <span style={{ color: "#B91C1C" }}> *</span>}
          </label>
          {(f.type === "text" || f.type === "email" || f.type === "phone") && (
            <input
              type={f.type === "email" ? "email" : "text"}
              value={(answers[f.id] as string) ?? ""}
              onChange={(e) => setAnswer(f.id, e.target.value)}
              className="w-full h-10 rounded-xl px-3 text-sm border outline-none"
              style={{ borderColor: "rgba(0,0,0,0.15)" }}
            />
          )}
          {f.type === "textarea" && (
            <textarea
              value={(answers[f.id] as string) ?? ""}
              onChange={(e) => setAnswer(f.id, e.target.value)}
              rows={4}
              className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
              style={{ borderColor: "rgba(0,0,0,0.15)" }}
            />
          )}
          {f.type === "select" && (
            <select
              value={(answers[f.id] as string) ?? ""}
              onChange={(e) => setAnswer(f.id, e.target.value)}
              className="w-full h-10 rounded-xl px-3 text-sm border outline-none"
              style={{ borderColor: "rgba(0,0,0,0.15)" }}
            >
              <option value="">Select…</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {f.type === "radio" && (
            <div className="space-y-1.5">
              {f.options?.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={f.id} value={o.value} checked={answers[f.id] === o.value} onChange={() => setAnswer(f.id, o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          )}
          {f.type === "checkbox" && (
            <div className="space-y-1.5">
              {f.options?.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={((answers[f.id] as string[]) ?? []).includes(o.value)} onChange={() => toggleCheckbox(f.id, o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          )}
          {f.type === "rating" && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setAnswer(f.id, String(n))}
                  className="w-9 h-9 rounded-full border text-sm font-semibold"
                  style={{ borderColor: "rgba(0,0,0,0.15)", background: answers[f.id] === String(n) ? "#D4AF37" : "transparent" }}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-xs" style={{ color: "#B91C1C" }}>{error}</p>}
      <button type="submit" disabled={submitting}
        className="w-full h-11 rounded-xl font-semibold text-sm disabled:opacity-50"
        style={{ background: "#D4AF37", color: "#000" }}>
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
