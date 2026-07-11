"use client";

import { useState, useEffect, useRef } from "react";
import {
  loadPricing,
  savePricing,
  type PricingConfig,
  type PricingPlan,
  DEFAULT_PRICING,
} from "@/lib/superAdmin";
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Save,
  Check,
  Eye,
  EyeOff,
  Star,
  Tag,
  Percent,
  DollarSign,
  Type,
  FileText,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  RefreshCw,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const PRESET_COLORS = [
  { label: "Subtle",   value: "border-white/[0.1]" },
  { label: "Blue",     value: "border-blue-500/50" },
  { label: "Violet",   value: "border-violet-500/50" },
  { label: "Amber",    value: "border-amber-500/30" },
  { label: "Emerald",  value: "border-emerald-500/50" },
  { label: "Rose",     value: "border-rose-500/50" },
  { label: "Cyan",     value: "border-cyan-500/50" },
];

const COLOR_DOT: Record<string, string> = {
  "border-white/[0.1]":     "bg-white/40",
  "border-blue-500/50":     "bg-blue-500",
  "border-violet-500/50":   "bg-violet-500",
  "border-amber-500/30":    "bg-amber-400",
  "border-emerald-500/50":  "bg-emerald-500",
  "border-rose-500/50":     "bg-rose-500",
  "border-cyan-500/50":     "bg-cyan-400",
};

// ─── mini live preview card ───────────────────────────────────────────────────

function PlanPreview({ plan, annualSave }: { plan: PricingPlan; annualSave: number }) {
  const discountedMonthly =
    plan.discount > 0 ? plan.price * (1 - plan.discount / 100) : null;

  return (
    <div className={`rounded-xl border-2 ${plan.color} bg-white/[0.03] p-4 flex flex-col gap-3 w-full`}>
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-base">{plan.name || "Plan Name"}</span>
            {plan.isPopular && (
              <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full font-semibold">
                {plan.badge || "Most Popular"}
              </span>
            )}
            {!plan.isPopular && plan.badge && (
              <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                {plan.badge}
              </span>
            )}
          </div>
          <p className="text-white/50 text-[11px] mt-0.5 line-clamp-2">{plan.desc}</p>
        </div>
        {plan.isHidden && (
          <span className="text-white/30 mt-1 shrink-0">
            <EyeOff size={14} />
          </span>
        )}
      </div>

      {/* price */}
      <div>
        {plan.isCustom ? (
          <span className="text-2xl font-bold text-white">Custom</span>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-white">
              ${discountedMonthly !== null ? discountedMonthly.toFixed(0) : plan.price}
            </span>
            <span className="text-white/40 text-xs mb-1">/mo</span>
            {discountedMonthly !== null && (
              <span className="text-white/40 text-xs mb-1 line-through ml-1">${plan.price}</span>
            )}
          </div>
        )}
        {!plan.isCustom && (
          <p className="text-white/30 text-[11px]">
            ${plan.annual}/mo billed annually · Save {annualSave}%
          </p>
        )}
        {plan.offerLabel && (
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full mt-1 inline-block">
            {plan.offerLabel}
          </span>
        )}
      </div>

      {/* cta button */}
      <button className="w-full rounded-lg bg-violet-600 text-white text-xs font-semibold py-2">
        {plan.cta || "Get Started"}
      </button>

      {/* features */}
      {plan.features.length > 0 && (
        <ul className="flex flex-col gap-1">
          {plan.features.slice(0, 5).map((f, i) => (
            <li key={i} className="flex items-start gap-1.5 text-white/70 text-[11px]">
              <Check size={11} className="text-emerald-400 mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
          {plan.features.length > 5 && (
            <li className="text-white/30 text-[11px] pl-4">+{plan.features.length - 5} more…</li>
          )}
        </ul>
      )}

      {/* not included */}
      {plan.notIncluded.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-white/[0.06] pt-2">
          {plan.notIncluded.slice(0, 3).map((f, i) => (
            <li key={i} className="flex items-start gap-1.5 text-white/30 text-[11px] line-through">
              <X size={11} className="text-rose-500/60 mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── feature list editor ──────────────────────────────────────────────────────

function FeatureListEditor({
  items,
  onChange,
  icon,
  iconColor,
  placeholder,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  icon: "check" | "x";
  iconColor: string;
  placeholder: string;
  addLabel: string;
}) {
  const [newItem, setNewItem] = useState("");

  const add = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem("");
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const update = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5 group">
          <span className={`shrink-0 ${iconColor}`}>
            {icon === "check" ? <Check size={14} /> : <X size={14} />}
          </span>
          <input
            value={item}
            onChange={(e) => update(idx, e.target.value)}
            className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500/60"
            placeholder={placeholder}
          />
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              className="text-white/30 hover:text-white disabled:opacity-20 transition-colors"
            >
              <ChevronUp size={13} />
            </button>
            <button
              onClick={() => moveDown(idx)}
              disabled={idx === items.length - 1}
              className="text-white/30 hover:text-white disabled:opacity-20 transition-colors"
            >
              <ChevronDown size={13} />
            </button>
          </div>
          <button
            onClick={() => remove(idx)}
            className="shrink-0 text-rose-400/70 hover:text-rose-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* add row */}
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`shrink-0 opacity-40 ${iconColor}`}>
          {icon === "check" ? <Check size={14} /> : <X size={14} />}
        </span>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="flex-1 min-w-0 bg-white/[0.02] border border-dashed border-white/[0.07] rounded-lg px-3 py-1.5 text-white/60 text-sm placeholder-white/20 focus:outline-none focus:border-violet-500/40"
          placeholder={addLabel}
        />
        <button
          onClick={add}
          className="shrink-0 p-1.5 rounded-lg bg-white/[0.05] hover:bg-violet-600/30 text-white/40 hover:text-violet-300 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── small UI primitives ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.025] border border-white/[0.07] rounded-xl p-5 flex flex-col gap-4">
      <h3 className="text-white/80 text-xs font-semibold uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-white/50 text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/[0.04] border border-white/[0.07] rounded-lg py-2 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500/60 ${
          icon ? "pl-9 pr-3" : "px-3"
        }`}
      />
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  icon,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>
      )}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full bg-white/[0.04] border border-white/[0.07] rounded-lg py-2 text-white text-sm focus:outline-none focus:border-violet-500/60 ${
          icon ? "pl-9 pr-3" : "px-3"
        }`}
      />
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
  activeColor = "bg-violet-600",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  activeColor?: string;
}) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center gap-3 w-full group">
      <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? activeColor : "bg-white/10"}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <span className={`text-sm transition-colors ${value ? "text-white" : "text-white/40"}`}>
        {label}
      </span>
      <span className={`ml-auto ${value ? "text-white/60" : "text-white/20"}`}>
        {value ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
      </span>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function PricingManager() {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load from localStorage on mount
  useEffect(() => {
    setPricing(loadPricing());
  }, []);

  // auto-select first plan
  useEffect(() => {
    if (!selectedId && pricing.plans.length > 0) {
      setSelectedId(pricing.plans[0].id);
    }
  }, [pricing.plans, selectedId]);

  const selectedPlan = pricing.plans.find((p) => p.id === selectedId) ?? null;

  // ── global settings ──────────────────────────────────────────────────────

  const setGlobal = <K extends keyof PricingConfig>(key: K, val: PricingConfig[K]) =>
    setPricing((prev) => ({ ...prev, [key]: val }));

  // ── plan helpers ──────────────────────────────────────────────────────────

  const updatePlan = (patch: Partial<PricingPlan>) => {
    if (!selectedId) return;
    setPricing((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)),
    }));
  };

  const addPlan = () => {
    const id = genId();
    const newPlan: PricingPlan = {
      id,
      name: "New Plan",
      price: 49,
      annual: 39,
      isCustom: false,
      badge: "",
      desc: "Plan description",
      features: [],
      notIncluded: [],
      cta: "Get Started",
      discount: 0,
      offerLabel: "",
      isPopular: false,
      isHidden: false,
      color: "border-white/[0.1]",
    };
    setPricing((prev) => ({ ...prev, plans: [...prev.plans, newPlan] }));
    setSelectedId(id);
  };

  const deletePlan = (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      deleteTimer.current = setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    setDeleteConfirm(null);
    const remaining = pricing.plans.filter((p) => p.id !== id);
    setPricing((prev) => ({ ...prev, plans: remaining }));
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setPricing((prev) => {
      const plans = [...prev.plans];
      [plans[idx - 1], plans[idx]] = [plans[idx], plans[idx - 1]];
      return { ...prev, plans };
    });
  };

  const moveDown = (idx: number) => {
    if (idx === pricing.plans.length - 1) return;
    setPricing((prev) => {
      const plans = [...prev.plans];
      [plans[idx], plans[idx + 1]] = [plans[idx + 1], plans[idx]];
      return { ...prev, plans };
    });
  };

  // ── save / reset ──────────────────────────────────────────────────────────

  const handleSave = () => {
    savePricing(pricing);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setPricing(DEFAULT_PRICING);
    setSelectedId(DEFAULT_PRICING.plans[0]?.id ?? null);
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#05080f] flex flex-col">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#05080f]/90 backdrop-blur border-b border-white/[0.07] px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-semibold text-base">Pricing Manager</h1>
          <p className="text-white/40 text-xs">Manage plans shown on the public pricing page</p>
        </div>

        {/* global controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-white/50 text-xs whitespace-nowrap">
            <Percent size={13} className="text-violet-400" />
            Annual Save %
            <input
              type="number"
              min={0}
              max={100}
              value={pricing.annualSavePercent}
              onChange={(e) => setGlobal("annualSavePercent", Number(e.target.value))}
              className="w-16 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-violet-500/60"
            />
          </label>

          <label className="flex items-center gap-2 text-white/50 text-xs whitespace-nowrap">
            <Tag size={13} className="text-violet-400" />
            Trial Days
            <input
              type="number"
              min={0}
              value={pricing.trialDays}
              onChange={(e) => setGlobal("trialDays", Number(e.target.value))}
              className="w-16 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-violet-500/60"
            />
          </label>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-white/[0.07] transition-all"
          >
            <RefreshCw size={13} />
            Reset
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              saved ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"
            }`}
          >
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT sidebar: plan list ──────────────────────────────────────── */}
        <aside className="w-64 shrink-0 border-r border-white/[0.07] flex flex-col overflow-y-auto">
          <div className="p-3 flex flex-col gap-2">
            <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest px-1 pt-1">
              Plans ({pricing.plans.length})
            </p>

            {pricing.plans.map((plan, idx) => {
              const isSelected = plan.id === selectedId;
              const isDeleting = deleteConfirm === plan.id;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedId(plan.id)}
                  className={`relative rounded-xl border cursor-pointer transition-all group ${
                    isSelected
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    {/* color dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[plan.color] ?? "bg-white/30"}`} />

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? "text-violet-300" : "text-white/80"}`}>
                        {plan.name}
                      </p>
                      <p className="text-white/30 text-[11px]">
                        {plan.isCustom ? "Custom" : `$${plan.price}/mo`}
                        {plan.isHidden && " · Hidden"}
                      </p>
                    </div>

                    {/* reorder arrows */}
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveUp(idx); }}
                        disabled={idx === 0}
                        className="text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveDown(idx); }}
                        disabled={idx === pricing.plans.length - 1}
                        className="text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>

                    {/* delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                      title={isDeleting ? "Click again to confirm" : "Delete plan"}
                      className={`shrink-0 p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 ${
                        isDeleting
                          ? "opacity-100 text-rose-400 bg-rose-500/10"
                          : "text-white/20 hover:text-rose-400"
                      }`}
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {isDeleting && (
                    <p className="px-3 pb-2 text-rose-400 text-[10px]">Click × again to confirm</p>
                  )}
                </div>
              );
            })}

            <button
              onClick={addPlan}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-white/[0.07] text-white/30 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/5 text-xs font-medium transition-all mt-1"
            >
              <Plus size={14} />
              Add New Plan
            </button>
          </div>
        </aside>

        {/* ── RIGHT: editor + preview ──────────────────────────────────────── */}
        {selectedPlan ? (
          <div className="flex-1 flex overflow-hidden min-w-0">

            {/* editor */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 min-w-0">

              {/* 1. Basic Info */}
              <Section title="Basic Info">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Plan Name">
                    <TextInput
                      value={selectedPlan.name}
                      onChange={(v) => updatePlan({ name: v })}
                      placeholder="e.g. Growth"
                      icon={<Type size={14} />}
                    />
                  </Field>
                  <Field label="Badge Text">
                    <TextInput
                      value={selectedPlan.badge}
                      onChange={(v) => updatePlan({ badge: v })}
                      placeholder='e.g. "Most Popular"'
                      icon={<Tag size={14} />}
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <TextInput
                    value={selectedPlan.desc}
                    onChange={(v) => updatePlan({ desc: v })}
                    placeholder="Short plan description…"
                    icon={<FileText size={14} />}
                  />
                </Field>

                <Field label="Button / CTA Text">
                  <TextInput
                    value={selectedPlan.cta}
                    onChange={(v) => updatePlan({ cta: v })}
                    placeholder='e.g. "Start Free Trial"'
                  />
                </Field>

                <Field label="Border Color">
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updatePlan({ color: c.value })}
                        title={c.label}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                          selectedPlan.color === c.value
                            ? "border-violet-500/70 bg-violet-500/15 text-violet-300"
                            : "border-white/[0.07] bg-white/[0.03] text-white/40 hover:text-white/70"
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[c.value] ?? "bg-white/30"}`} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>

              {/* 2. Pricing */}
              <Section title="Pricing">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Monthly Price ($)">
                    <NumberInput
                      value={selectedPlan.price}
                      onChange={(v) => updatePlan({ price: v })}
                      icon={<DollarSign size={14} />}
                      min={0}
                    />
                  </Field>
                  <Field label="Annual Price ($/mo)">
                    <NumberInput
                      value={selectedPlan.annual}
                      onChange={(v) => updatePlan({ annual: v })}
                      icon={<DollarSign size={14} />}
                      min={0}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Discount %">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                        <Percent size={14} />
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedPlan.discount}
                        onChange={(e) => updatePlan({ discount: Number(e.target.value) })}
                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/60"
                      />
                      {selectedPlan.discount > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-semibold pointer-events-none">
                          → ${(selectedPlan.price * (1 - selectedPlan.discount / 100)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Field>
                  <Field label="Offer Label">
                    <TextInput
                      value={selectedPlan.offerLabel}
                      onChange={(v) => updatePlan({ offerLabel: v })}
                      placeholder='e.g. "Limited Time!"'
                    />
                  </Field>
                </div>

                <Toggle
                  value={selectedPlan.isCustom}
                  onChange={(v) => updatePlan({ isCustom: v })}
                  label='Custom Price — shows "Custom" instead of amount'
                />
              </Section>

              {/* 3. Display Toggles */}
              <Section title="Display Options">
                <Toggle
                  value={selectedPlan.isPopular}
                  onChange={(v) => updatePlan({ isPopular: v })}
                  label="Most Popular (highlighted badge)"
                  activeColor="bg-violet-600"
                />
                <Toggle
                  value={selectedPlan.isHidden}
                  onChange={(v) => updatePlan({ isHidden: v })}
                  label="Hide this plan from the pricing page"
                  activeColor="bg-rose-600"
                />
              </Section>

              {/* 4. Features */}
              <Section title="Features (✓ Included)">
                <FeatureListEditor
                  items={selectedPlan.features}
                  onChange={(features) => updatePlan({ features })}
                  icon="check"
                  iconColor="text-emerald-400"
                  placeholder="Feature description…"
                  addLabel="Add a feature… (press Enter)"
                />
              </Section>

              {/* 5. Not Included */}
              <Section title="Not Included (✗ Strikethrough)">
                <FeatureListEditor
                  items={selectedPlan.notIncluded}
                  onChange={(notIncluded) => updatePlan({ notIncluded })}
                  icon="x"
                  iconColor="text-rose-500"
                  placeholder="Not included item…"
                  addLabel="Add an exclusion… (press Enter)"
                />
              </Section>

              <div className="h-4" />
            </div>

            {/* 6. Preview sidebar */}
            <aside className="w-72 shrink-0 border-l border-white/[0.07] overflow-y-auto p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-violet-400" />
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Live Preview</p>
              </div>

              <PlanPreview plan={selectedPlan} annualSave={pricing.annualSavePercent} />

              {/* plan id */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 flex flex-col gap-0.5">
                <span className="text-white/30 text-[10px] uppercase tracking-wider">Plan ID</span>
                <code className="text-white/50 text-xs font-mono">{selectedPlan.id}</code>
              </div>

              {/* quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-center">
                  <p className="text-emerald-400 text-lg font-bold leading-tight">{selectedPlan.features.length}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">Features</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-center">
                  <p className="text-rose-400 text-lg font-bold leading-tight">{selectedPlan.notIncluded.length}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">Excluded</p>
                </div>
              </div>

              <p className="text-white/20 text-[10px] text-center leading-relaxed">
                Changes are local until you click{" "}
                <span className="text-violet-400">Save Changes</span>.
              </p>
            </aside>
          </div>
        ) : (
          /* empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                <Star size={24} className="text-white/20" />
              </div>
              <p className="text-white/40 text-sm">No plan selected</p>
              <button
                onClick={addPlan}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
              >
                <Plus size={16} />
                Add your first plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
