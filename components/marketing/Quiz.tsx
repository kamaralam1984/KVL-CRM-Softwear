"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// A voluntary, curiosity-driven identification path: visitor answers a few
// questions purely for their own benefit (a plan recommendation), and only
// gives a phone number at the very end to receive the result. Reuses the
// existing identify() -> resolveIdentity() pipeline — no separate lead path.

import { useState } from "react";
import Link from "next/link";
import { kvlAnalytics } from "@/lib/tracking/sdk/client";

interface Question {
  key: "teamSize" | "volume" | "tool" | "painPoint";
  label: string;
  options: { label: string; value: string; weight: number }[];
}

const QUESTIONS: Question[] = [
  {
    key: "teamSize",
    label: "How big is your sales/support team?",
    options: [
      { label: "Just me", value: "1", weight: 0 },
      { label: "2 – 10 people", value: "2-10", weight: 1 },
      { label: "11 – 50 people", value: "11-50", weight: 2 },
      { label: "50+ people", value: "50+", weight: 3 },
    ],
  },
  {
    key: "volume",
    label: "Roughly how many new leads do you get per month?",
    options: [
      { label: "Under 50", value: "<50", weight: 0 },
      { label: "50 – 200", value: "50-200", weight: 1 },
      { label: "200 – 1,000", value: "200-1000", weight: 2 },
      { label: "1,000+", value: "1000+", weight: 3 },
    ],
  },
  {
    key: "tool",
    label: "What are you using to manage leads today?",
    options: [
      { label: "Spreadsheets / notes", value: "spreadsheets", weight: 0 },
      { label: "Another CRM", value: "other-crm", weight: 1 },
      { label: "Nothing yet", value: "nothing", weight: 0 },
    ],
  },
  {
    key: "painPoint",
    label: "What's your biggest pain point right now?",
    options: [
      { label: "Losing track of leads", value: "losing-leads", weight: 1 },
      { label: "No automation / manual follow-up", value: "no-automation", weight: 1 },
      { label: "Poor reporting & visibility", value: "poor-reporting", weight: 1 },
      { label: "Team collaboration is messy", value: "collaboration", weight: 1 },
    ],
  },
];

type Plan = "Starter" | "Growth" | "Enterprise";

function recommendPlan(answers: Record<string, { value: string; weight: number }>): Plan {
  const score = Object.values(answers).reduce((sum, a) => sum + a.weight, 0);
  if (score <= 1) return "Starter";
  if (score <= 4) return "Growth";
  return "Enterprise";
}

const PLAN_COPY: Record<Plan, string> = {
  Starter: "Perfect for solo founders and small teams just getting organized.",
  Growth: "Built for growing teams that need automation and real reporting.",
  Enterprise: "Designed for high-volume teams that need scale, SSO, and dedicated support.",
};

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { value: string; weight: number }>>({});
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalSteps = QUESTIONS.length;
  const onResult = step >= totalSteps;
  const plan = onResult ? recommendPlan(answers) : null;

  function choose(q: Question, opt: Question["options"][number]) {
    const next = { ...answers, [q.key]: { value: opt.value, weight: opt.weight } };
    setAnswers(next);
    if (step === 0) kvlAnalytics.track("quiz_start");
    setStep((s) => s + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !plan) return;
    setLoading(true);
    kvlAnalytics.track("quiz_completed", { plan, ...Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.value])) });
    kvlAnalytics.identify({ name: name.trim(), phone: phone.trim() });
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 900);
  }

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 max-w-xl mx-auto">
      {!onResult && (
        <>
          <div className="flex items-center gap-1.5 mb-6">
            {QUESTIONS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-gradient-to-r from-blue-500 to-violet-500" : "bg-white/[0.08]"}`} />
            ))}
          </div>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Question {step + 1} of {totalSteps}</p>
          <h2 className="text-xl md:text-2xl font-black text-white mb-6">{QUESTIONS[step].label}</h2>
          <div className="space-y-3">
            {QUESTIONS[step].options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => choose(QUESTIONS[step], opt)}
                className="w-full text-left px-5 py-3.5 rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm text-slate-200 hover:border-blue-500/50 hover:bg-white/[0.06] transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {onResult && !submitted && (
        <div>
          <span className="inline-block text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">Your Result</span>
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            We recommend <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{plan}</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">{plan && PLAN_COPY[plan]}</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Get this result + a personalized quote →</p>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-colors"
            />
            <input
              required
              type="tel"
              placeholder="Phone number *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send Me My Result →"}
            </button>
            <p className="text-xs text-slate-600 text-center">
              We&apos;ll only use this to send your result and follow up. See our <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
            </p>
          </form>
        </div>
      )}

      {submitted && (
        <div className="text-center py-6">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-white mb-2">Sent!</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Our team will reach out shortly with your {plan} plan details and a personalized quote.
          </p>
          <Link href="/pricing" className="text-blue-400 hover:underline text-sm">See all plans →</Link>
        </div>
      )}
    </div>
  );
}
