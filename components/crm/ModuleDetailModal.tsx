"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ArrowRight, ChevronRight } from "lucide-react";
import type { ModuleContent } from "@/lib/moduleContent";

interface Props {
  module: ModuleContent | null;
  dark: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export default function ModuleDetailModal({ module: mod, dark, onClose, onGetStarted }: Props) {
  /* close on ESC */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  /* lock body scroll while open */
  useEffect(() => {
    if (mod) document.body.style.overflow = "hidden";
    else      document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mod]);

  const goldGrad = "linear-gradient(135deg,#D4AF37,#F5C842)";

  return (
    <AnimatePresence>
      {mod && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}
          onClick={onClose}
        >
          <motion.article
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{
              background: dark ? "linear-gradient(135deg,#0a0e1a,#080c14)" : "#ffffff",
              border: `1px solid ${mod.color}33`,
              boxShadow: `0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px ${mod.color}22`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-t-3xl px-8 pt-10 pb-8"
              style={{ background: `linear-gradient(135deg,${mod.color}18,${mod.color}06)`, borderBottom: `1px solid ${mod.color}22` }}>

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{ background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}
                aria-label="Close"
              >
                <X size={16} style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }} />
              </button>

              {/* Icon + title */}
              <div className="flex items-start gap-5 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl"
                  style={{ background: mod.color + "22", border: `2px solid ${mod.color}44` }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={mod.color}>
                    <circle cx="12" cy="12" r="10" opacity="0.2"/>
                    <path d="M9 12l2 2 4-4" stroke={mod.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: mod.color }}>KVl CRM</p>
                  <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: dark ? "#ffffff" : "#0d0d0d" }}>{mod.title}</h1>
                  <p className="text-base font-medium" style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }}>{mod.tagline}</p>
                </div>
              </div>

              {/* Stats strip */}
              <div className="flex flex-wrap gap-3">
                {mod.stats.map(s => (
                  <div key={s.label}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ background: mod.color + "14", border: `1px solid ${mod.color}28` }}>
                    <span className="text-lg font-black" style={{ color: mod.color }}>{s.value}</span>
                    <span className="text-xs" style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="px-8 py-8 space-y-10">

              {/* Intro paragraph */}
              <p className="text-base leading-relaxed font-medium" style={{ color: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" }}>
                {mod.intro}
              </p>

              {/* Hero paragraphs */}
              <section>
                <div className="space-y-4">
                  {mod.heroText.map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}>
                      {para}
                    </p>
                  ))}
                </div>
              </section>

              {/* Key Benefits */}
              <section>
                <h2 className="text-xl font-black mb-5 flex items-center gap-2" style={{ color: dark ? "#ffffff" : "#0d0d0d" }}>
                  <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: mod.color }} />
                  Key Benefits
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {mod.benefits.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="rounded-2xl p-5"
                      style={{
                        background: dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)",
                        border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: mod.color + "22" }}>
                          <Check size={11} style={{ color: mod.color }} />
                        </div>
                        <h3 className="text-sm font-bold" style={{ color: dark ? "#ffffff" : "#0d0d0d" }}>{b.title}</h3>
                      </div>
                      <p className="text-xs leading-relaxed pl-7" style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{b.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* How It Works */}
              <section>
                <h2 className="text-xl font-black mb-5 flex items-center gap-2" style={{ color: dark ? "#ffffff" : "#0d0d0d" }}>
                  <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: mod.color }} />
                  How It Works
                </h2>
                <div className="relative">
                  <div className="hidden md:block absolute left-5 top-6 bottom-6 w-px"
                    style={{ background: `linear-gradient(to bottom, ${mod.color}40, transparent)` }} />
                  <div className="space-y-4">
                    {mod.howItWorks.map((step, i) => (
                      <div key={i} className="flex gap-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-black flex-shrink-0 shadow-lg"
                          style={{ background: i === 0 ? goldGrad : mod.color + "28", color: i === 0 ? "#000" : mod.color }}>
                          {step.num}
                        </div>
                        <div className="flex-1 pb-2">
                          <h3 className="text-sm font-bold mb-1" style={{ color: dark ? "#ffffff" : "#0d0d0d" }}>{step.title}</h3>
                          <p className="text-xs leading-relaxed" style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Advanced Features */}
              <section>
                <h2 className="text-xl font-black mb-5 flex items-center gap-2" style={{ color: dark ? "#ffffff" : "#0d0d0d" }}>
                  <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: mod.color }} />
                  Advanced Features
                </h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {mod.features.map((f, i) => (
                    <div key={i} className="rounded-xl p-4"
                      style={{ background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}` }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ChevronRight size={12} style={{ color: mod.color }} />
                        <h3 className="text-xs font-bold" style={{ color: dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)" }}>{f.title}</h3>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)" }}>{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <section className="rounded-2xl p-8 text-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg,${mod.color}12,${mod.color}04)`, border: `1px solid ${mod.color}25` }}>
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at center top,${mod.color}18,transparent 60%)` }} />
                <div className="relative">
                  <h2 className="text-2xl font-black mb-2" style={{ color: dark ? "#ffffff" : "#0d0d0d" }}>
                    Ready to unlock {mod.title}?
                  </h2>
                  <p className="text-sm mb-6" style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                    Start your 14-day free trial. No credit card required.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 0 36px rgba(212,175,55,0.45)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { onClose(); onGetStarted(); }}
                      className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black text-black"
                      style={{ background: goldGrad, boxShadow: "0 8px 28px rgba(212,175,55,0.3)" }}
                    >
                      Start Free Trial
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                    <button
                      onClick={onClose}
                      className="text-sm font-medium px-6 py-3.5"
                      style={{ color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}
                    >
                      View All Features
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
