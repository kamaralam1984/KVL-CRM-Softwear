"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { loadPricing, type PricingConfig, DEFAULT_PRICING } from "@/lib/superAdmin";

const faqs = [
  { q: "Is there a free trial?", a: "Yes. Every plan comes with a full-featured free trial. No credit card is required to start." },
  { q: "Can I change my plan anytime?", a: "Absolutely. You can upgrade or downgrade your plan at any time from your account settings." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards (Visa, Mastercard, American Express), PayPal and bank wire transfers." },
  { q: "Do you offer discounts for annual billing?", a: "Yes. Choosing annual billing saves you significantly compared to monthly billing." },
  { q: "What happens to my data if I cancel?", a: "You own your data. Upon cancellation, you have 30 days to export all your contacts, deals, notes, and activity history." },
  { q: "Is there a discount for nonprofits or startups?", a: "Yes. We offer 50% off all plans for registered nonprofit organizations and early-stage startups. Contact our team to apply." },
];

function gridColsClass(count: number): string {
  if (count === 2) return "sm:grid-cols-2";
  if (count === 3) return "sm:grid-cols-3";
  if (count === 4) return "sm:grid-cols-2 lg:grid-cols-4";
  return "sm:grid-cols-2 lg:grid-cols-3";
}

export default function PricingPage() {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [annual, setAnnual] = useState(false);
  const [priceKey, setPriceKey] = useState(0);

  useEffect(() => {
    setPricing(loadPricing());
    const handler = () => {
      setPricing(loadPricing());
    };
    window.addEventListener("pricing-updated", handler);
    return () => window.removeEventListener("pricing-updated", handler);
  }, []);

  const handleToggle = () => {
    setPriceKey(k => k + 1);
    setAnnual(a => !a);
  };

  const visiblePlans = pricing.plans.filter(p => !p.isHidden);

  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">← KVl CRM</Link>
        <div className="flex gap-4">
          <Link href="/features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</Link>
          <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-amber-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10">
            Simple Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-6">
            Invest in Your Revenue.<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Pay Only for What You Need.
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6">
            Every plan includes a {pricing.trialDays}-day free trial. No credit card required.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm transition-colors ${!annual ? "text-white font-semibold" : "text-slate-500"}`}>
              Monthly
            </span>
            <button
              onClick={handleToggle}
              aria-label="Toggle annual billing"
              className="relative w-12 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ background: annual ? "#3b82f6" : "rgba(255,255,255,0.1)" }}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ease-in-out ${annual ? "left-7" : "left-1"}`}
              />
            </button>
            <span className={`text-sm transition-colors ${annual ? "text-white font-semibold" : "text-slate-500"}`}>
              Annual
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
              Save {pricing.annualSavePercent}%
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className={`grid grid-cols-1 gap-6 mb-20 ${gridColsClass(visiblePlans.length)}`}>
          {visiblePlans.map(plan => {
            const isHighlighted = plan.isPopular || (plan.badge !== "" && plan.badge != null);
            const basePrice = annual ? plan.annual : plan.price;
            const hasDiscount = plan.discount > 0;
            const originalPrice = basePrice;
            const discountedPrice = hasDiscount
              ? Math.round(basePrice * (1 - plan.discount / 100))
              : null;
            const displayPrice = discountedPrice ?? basePrice;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border bg-white/[0.02] p-6 relative flex flex-col transition-transform duration-200 hover:-translate-y-0.5 ${plan.color ?? "border-white/[0.08]"} ${isHighlighted ? "shadow-2xl shadow-blue-500/10" : ""}`}
              >
                {/* Offer label — glowing amber badge */}
                {plan.offerLabel && (
                  <div className="mb-3">
                    <span
                      className="inline-block text-xs px-3 py-1 rounded-full font-bold text-amber-300 border border-amber-400/40 bg-amber-500/10"
                      style={{ boxShadow: "0 0 10px 2px rgba(251,191,36,0.25)" }}
                    >
                      {plan.offerLabel}
                    </span>
                  </div>
                )}

                {/* Most Popular / custom badge */}
                {isHighlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg whitespace-nowrap">
                      {plan.badge || "Most Popular"}
                    </span>
                  </div>
                )}

                {/* Name + description */}
                <div className="mb-5 mt-1">
                  <h2 className="text-xl font-black text-white mb-1">{plan.name}</h2>
                  <p className="text-xs text-slate-500">{plan.desc}</p>
                </div>

                {/* Price block */}
                <div className="mb-6">
                  {plan.isCustom ? (
                    <div className="text-4xl font-black text-white">Custom</div>
                  ) : (
                    <div key={priceKey} style={{ animation: "priceFade 0.35s ease" }}>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {hasDiscount && (
                          <span className="text-slate-500 line-through text-lg">${originalPrice}</span>
                        )}
                        <span className="text-4xl font-black text-white">${displayPrice}</span>
                        <span className="text-slate-500 text-sm">/mo</span>
                        {hasDiscount && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/20">
                            -{plan.discount}% OFF
                          </span>
                        )}
                      </div>
                      {annual && (
                        <p className="text-xs text-emerald-400 mt-1">
                          ${plan.annual * 12}/yr billed annually — save {pricing.annualSavePercent}%
                        </p>
                      )}
                      {!annual && plan.annual > 0 && (
                        <p className="text-xs text-slate-600 mt-1">
                          ${plan.annual}/mo billed annually
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded?.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-slate-700 mt-0.5 flex-shrink-0">✗</span>
                      <span className="line-through">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/"
                  className={`block text-center py-3 rounded-xl text-sm font-bold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                    isHighlighted
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                      : "border border-white/10 text-slate-300 hover:bg-white/[0.05] hover:border-white/20"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* All plans include */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 mb-20 text-center">
          <h2 className="text-lg font-bold text-white mb-4">All Plans Include</h2>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            {[
              "SSL encryption",
              "99.9% uptime SLA",
              "GDPR compliance",
              "Daily backups",
              "SOC 2 Type II",
              "Free data export",
              "Browser & mobile access",
              "Regular feature updates",
            ].map(f => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>{f}
              </span>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-3xl font-black text-center mb-10">Pricing FAQ</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map(faq => (
              <div key={faq.q} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/[0.05] transition-colors"
            >
              Talk to Sales →
            </Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/[0.05] py-8 text-center text-xs text-slate-600">
        <div className="flex justify-center gap-6 mb-3">
          {[
            ["Features", "/features"],
            ["Pricing", "/pricing"],
            ["Privacy Policy", "/privacy"],
            ["Terms", "/terms"],
            ["Contact", "/contact"],
          ].map(([l, h]) => (
            <Link key={l} href={h} className="hover:text-white transition-colors">{l}</Link>
          ))}
        </div>
        © 2025 KVl CRM · FreedomWithAI. All rights reserved.
      </footer>

      <style>{`
        @keyframes priceFade {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
