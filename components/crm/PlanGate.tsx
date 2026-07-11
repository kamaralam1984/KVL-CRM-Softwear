"use client";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Check } from "lucide-react";
import {
  type FeatureKey, type PlanId, type PlanMatrix,
  FEATURE_LABELS, PLAN_LABELS, PLAN_PRICES, PLAN_COLORS,
  PLAN_ORDER, minPlanForFeature, DEFAULT_PLAN_MATRIX,
} from "@/lib/superAdmin";

interface PlanGateProps {
  feature:        FeatureKey;
  currentPlan:    PlanId;
  planMatrix?:    PlanMatrix;
  onUpgrade?:     () => void;
}

export default function PlanGate({
  feature,
  currentPlan,
  planMatrix = DEFAULT_PLAN_MATRIX,
  onUpgrade,
}: PlanGateProps) {
  const requiredPlan = minPlanForFeature(feature, planMatrix);
  const currentIdx   = PLAN_ORDER.indexOf(currentPlan);
  const requiredIdx  = requiredPlan ? PLAN_ORDER.indexOf(requiredPlan) : 99;
  const upgradeToPlans = PLAN_ORDER.slice(
    Math.max(currentIdx + 1, requiredIdx),
    PLAN_ORDER.length,
  ).slice(0, 2);

  const req = requiredPlan ?? "growth";
  const col = PLAN_COLORS[req];

  return (
    <div className="flex items-center justify-center h-full min-h-[70vh] p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-lg w-full text-center"
      >
        {/* Lock icon */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 mx-auto"
          style={{ background: col.bg, border: `1px solid ${col.border}` }}
        >
          <Lock size={32} style={{ color: col.text }} />
        </motion.div>

        {/* Headline */}
        <h2 className="text-2xl font-black text-white mb-2">
          {FEATURE_LABELS[feature]}
        </h2>
        <p className="text-sm text-slate-400 mb-2">
          is not available on your{" "}
          <span className="font-bold" style={{ color: PLAN_COLORS[currentPlan].text }}>
            {PLAN_LABELS[currentPlan]} plan
          </span>
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Upgrade to{" "}
          <span className="font-bold" style={{ color: col.text }}>
            {PLAN_LABELS[req]}
          </span>{" "}
          or higher to unlock this module.
        </p>

        {/* Upgrade plan cards */}
        {upgradeToPlans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {upgradeToPlans.map((planId) => {
              const c = PLAN_COLORS[planId];
              const planFeatures = planMatrix[planId];
              const featureCount = Object.values(planFeatures).filter(Boolean).length;
              return (
                <motion.div
                  key={planId}
                  whileHover={{ scale: 1.03, y: -3 }}
                  className="rounded-2xl p-5 text-left cursor-pointer transition-all"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}
                  onClick={onUpgrade}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-black" style={{ color: c.text }}>
                      {PLAN_LABELS[planId]}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {PLAN_PRICES[planId]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    <span className="font-bold text-white">{featureCount}</span> of 15 modules
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: c.text }}>
                    <Check size={12} />
                    Includes {FEATURE_LABELS[feature]}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* CTA button */}
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(212,175,55,0.3)" }}
          whileTap={{ scale: 0.97 }}
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black text-black"
          style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)" }}
        >
          Upgrade Plan
          <ArrowRight size={16} />
        </motion.button>

        <p className="text-xs text-slate-600 mt-4">
          Contact your Super Admin to upgrade your plan.
        </p>
      </motion.div>
    </div>
  );
}
