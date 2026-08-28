"use client";
// Phase 24 — shared block renderer used by both the builder's live canvas
// preview (components/crm/sections/KVlPages.tsx) and the public rendered
// page (app/p/[slug]/page.tsx), so "what you see in the builder" and "what
// visitors actually get" never drift apart into two implementations.

import { useState } from "react";
import type { PlacedBlock } from "@/lib/pages/blocks";
import { submitWebFormLead } from "@/lib/actions/webFormSubmissions";

function FormBlockView({ data }: { data: Extract<PlacedBlock["data"], { kind: "form" }> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = values["Full Name"] || values["Name"] || "";
    const email = values["Work Email"] || values["Email"] || "";
    await submitWebFormLead({ name, email, company: values["Company"] ?? "" }).catch(() => {});
    setSent(true);
  };

  if (sent) {
    return <p className="text-center font-semibold" style={{ color: "#00A86B" }}>Thanks — we&apos;ll be in touch shortly.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-2 max-w-sm mx-auto">
      <p className="text-sm font-bold mb-2">{data.heading}</p>
      {data.fields.map((f) => (
        <input
          key={f}
          placeholder={f}
          value={values[f] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
          className="w-full h-9 rounded-xl px-3 text-sm border outline-none"
          style={{ borderColor: "rgba(0,0,0,0.15)" }}
        />
      ))}
      <button type="submit" className="w-full h-10 rounded-xl font-black text-sm" style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)", color: "#000" }}>
        {data.submitLabel}
      </button>
    </form>
  );
}

export function BlockRenderer({ block }: { block: PlacedBlock }) {
  const d = block.data;
  switch (d.kind) {
    case "headline":
      return (
        <div className="text-center">
          <h2 className="text-2xl font-black mb-2">{d.text}</h2>
          {d.subtext && <p className="text-base opacity-70">{d.subtext}</p>}
        </div>
      );
    case "paragraph":
      return <p className="leading-relaxed">{d.text}</p>;
    case "button":
      return (
        <div className="text-center">
          <a href={d.href} className="inline-block px-6 py-3 rounded-xl font-bold" style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)", color: "#000" }}>
            {d.text}
          </a>
        </div>
      );
    case "image":
      return d.src
        ? <img src={d.src} alt={d.alt} className="w-full rounded-xl" />
        : <div className="h-40 rounded-xl flex items-center justify-center text-sm opacity-50" style={{ background: "rgba(0,0,0,0.05)" }}>Image placeholder</div>;
    case "two_columns":
      return (
        <div className="grid grid-cols-2 gap-6">
          <div>{d.left}</div>
          <div>{d.right}</div>
        </div>
      );
    case "form":
      return <FormBlockView data={d} />;
    case "testimonial":
      return (
        <blockquote className="text-center">
          <p className="text-lg italic mb-2">&ldquo;{d.quote}&rdquo;</p>
          <footer className="text-sm opacity-60">— {d.author}</footer>
        </blockquote>
      );
    case "stats_row":
      return (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${d.stats.length}, 1fr)` }}>
          {d.stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-xl font-black" style={{ color: "#D4AF37" }}>{s.value}</p>
              <p className="text-sm opacity-60">{s.label}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
