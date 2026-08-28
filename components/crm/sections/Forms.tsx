"use client";
// Phase 43 — Forms, Surveys & Quiz Builder. New section. A simpler, linear
// field-list builder (not a free-form canvas) reusing the exact @dnd-kit
// sortable pattern already proven in KVlPages.tsx, but for its own separate
// `forms` domain — a form/quiz needs to exist standalone (linked/embedded
// directly), not only nested inside a funnel page.

import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClipboardList, Plus, Copy, Check, Trash2, GripVertical, ExternalLink } from "lucide-react";
import {
  getForms, saveForm, publishForm, deleteForm, type FormRow, type FormKind,
} from "@/lib/actions/forms";
import {
  FIELD_TYPES, FIELD_TYPE_LABELS, defaultField, newFieldId,
  type FormField, type FieldType, type ScoreBand,
} from "@/lib/forms/fields";
import { getAccessToken } from "@/lib/security/clientSession";

const GOLD = "#D4AF37";
const EMERALD = "#00A86B";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `form-${Date.now().toString(36)}`;
}

function SortableField({ field, onUpdate, onRemove }: { field: FormField; onUpdate: (f: FormField) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const hasOptions = field.type === "select" || field.type === "radio" || field.type === "checkbox";

  const updateOption = (idx: number, patch: Partial<{ label: string; value: string; scoreWeight: number }>) => {
    const options = [...(field.options ?? [])];
    options[idx] = { ...options[idx], ...patch };
    onUpdate({ ...field, options });
  };
  const addOption = () => {
    const options = [...(field.options ?? []), { label: `Option ${(field.options?.length ?? 0) + 1}`, value: `option_${newFieldId()}`, scoreWeight: 0 }];
    onUpdate({ ...field, options });
  };
  const removeOption = (idx: number) => onUpdate({ ...field, options: (field.options ?? []).filter((_, i) => i !== idx) });

  return (
    <div ref={setNodeRef} className="rounded-xl border p-3 space-y-2" style={{ ...style, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab text-slate-500"><GripVertical size={14} /></button>
        <input value={field.label} onChange={(e) => onUpdate({ ...field, label: e.target.value })}
          placeholder="Field label" className="flex-1 px-2 py-1 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
        <span className="text-[10px] px-2 py-1 rounded-full text-slate-400" style={{ background: "rgba(255,255,255,0.05)" }}>{FIELD_TYPE_LABELS[field.type]}</span>
        <label className="flex items-center gap-1 text-[10px] text-slate-400">
          <input type="checkbox" checked={field.required} onChange={(e) => onUpdate({ ...field, required: e.target.checked })} /> Required
        </label>
        <button onClick={onRemove} className="text-rose-400 hover:text-rose-300 transition-colors"><Trash2 size={13} /></button>
      </div>
      {hasOptions && (
        <div className="pl-6 space-y-1.5">
          {(field.options ?? []).map((o, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={o.label} onChange={(e) => updateOption(i, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                placeholder="Option label" className="flex-1 px-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
              <input type="number" value={o.scoreWeight ?? 0} onChange={(e) => updateOption(i, { scoreWeight: Number(e.target.value) || 0 })}
                title="Quiz score weight" className="w-16 px-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
              <button onClick={() => removeOption(i)} className="text-rose-400"><Trash2 size={11} /></button>
            </div>
          ))}
          <button onClick={addOption} className="text-[10px] font-semibold" style={{ color: GOLD }}>+ Add Option</button>
        </div>
      )}
    </div>
  );
}

function ScoringRulesEditor({ bands, onChange }: { bands: ScoreBand[]; onChange: (b: ScoreBand[]) => void }) {
  const update = (i: number, patch: Partial<ScoreBand>) => {
    const next = [...bands];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...bands, { minScore: 0, maxScore: 10, outcomeTitle: "Result", outcomeText: "Thanks for taking the quiz!" }]);
  const remove = (i: number) => onChange(bands.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl border p-4 space-y-2" style={{ background: "rgba(212,175,55,0.04)", borderColor: "rgba(212,175,55,0.2)" }}>
      <p className="text-xs font-bold text-slate-200">Quiz Outcomes (by score range)</p>
      {bands.map((b, i) => (
        <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
          <input type="number" value={b.minScore} onChange={(e) => update(i, { minScore: Number(e.target.value) || 0 })} className="col-span-2 px-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
          <input type="number" value={b.maxScore} onChange={(e) => update(i, { maxScore: Number(e.target.value) || 0 })} className="col-span-2 px-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
          <input value={b.outcomeTitle} onChange={(e) => update(i, { outcomeTitle: e.target.value })} placeholder="Outcome title" className="col-span-3 px-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
          <input value={b.outcomeText} onChange={(e) => update(i, { outcomeText: e.target.value })} placeholder="Outcome message" className="col-span-4 px-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
          <button onClick={() => remove(i)} className="col-span-1 text-rose-400"><Trash2 size={12} /></button>
        </div>
      ))}
      <button onClick={add} className="text-[10px] font-semibold" style={{ color: GOLD }}>+ Add Score Range</button>
    </div>
  );
}

function FormEditor({ form, onClose, onSaved }: { form: FormRow; onClose: () => void; onSaved: (f: FormRow) => void }) {
  const [name, setName] = useState(form.name);
  const [kind, setKind] = useState<FormKind>(form.kind);
  const [fields, setFields] = useState<FormField[]>(form.fields);
  const [scoringRules, setScoringRules] = useState<ScoreBand[]>(form.scoring_rules ?? []);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addField = (type: FieldType) => setFields((prev) => [...prev, defaultField(type)]);
  const updateField = (id: string, patch: FormField) => setFields((prev) => prev.map((f) => (f.id === id ? patch : f)));
  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const save = async () => {
    const result = await saveForm({ id: form.id.startsWith("draft-") ? undefined : form.id, name, slug: form.slug, kind, fields, scoringRules }, getAccessToken());
    if (result) { onSaved(result); setSaved(true); setTimeout(() => setSaved(false), 1500); }
    return result;
  };

  // Gap-check fix: was reading the closure's `form.id` after awaiting
  // save(), which for a brand-new (never-saved) form is still the old
  // "draft-..." placeholder — save()'s real id only lands in the PARENT's
  // state via onSaved, not this render's own `form` prop. Using save()'s
  // return value directly avoids the stale read.
  const publish = async () => {
    const saved = await save();
    if (saved && !saved.id.startsWith("draft-")) await publishForm(saved.id, getAccessToken());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">← Back to Forms</button>
        <div className="flex gap-2">
          <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(212,175,55,0.12)", color: GOLD }}>
            {saved ? "Saved ✓" : "Save Draft"}
          </button>
          <button onClick={publish} className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Publish</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Form name"
          className="px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
        <div className="flex gap-2">
          {(["form", "survey", "quiz"] as FormKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border capitalize"
              style={{ background: kind === k ? "rgba(212,175,55,0.12)" : "transparent", borderColor: kind === k ? GOLD + "60" : "rgba(255,255,255,0.08)", color: kind === k ? GOLD : "#64748b" }}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FIELD_TYPES.map((t) => (
          <button key={t} onClick={() => addField(t)} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-crm-border text-slate-400 hover:border-gold/40 transition-colors">
            + {FIELD_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((f) => (
              <SortableField key={f.id} field={f} onUpdate={(patch) => updateField(f.id, patch)} onRemove={() => removeField(f.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {fields.length === 0 && <p className="text-xs text-slate-600 text-center py-6">No fields yet — add one above.</p>}

      {kind === "quiz" && <ScoringRulesEditor bands={scoringRules} onChange={setScoringRules} />}
    </div>
  );
}

export default function Forms() {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [editing, setEditing] = useState<FormRow | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { getForms(undefined, getAccessToken()).then(setForms).catch(() => {}); }, []);

  const createNew = () => {
    const name = "Untitled Form";
    setEditing({
      id: `draft-${Date.now()}`, site_id: "", slug: slugify(`${name}-${Date.now()}`), name,
      kind: "form", fields: [], scoring_rules: [], published: false, created_at: new Date().toISOString(),
    });
  };

  const onSaved = (f: FormRow) => {
    setForms((prev) => {
      const exists = prev.some((p) => p.id === f.id);
      return exists ? prev.map((p) => (p.id === f.id ? f : p)) : [f, ...prev];
    });
    setEditing(f);
  };

  const remove = async (id: string) => {
    const res = await deleteForm(id, getAccessToken());
    if (res.ok) setForms((prev) => prev.filter((f) => f.id !== id));
  };

  const copyLink = (slug: string) => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/${slug}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  };

  if (editing) {
    return (
      <div className="h-full overflow-y-auto p-6" style={{ background: "#080c14" }}>
        <FormEditor form={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full" style={{ background: "#080c14" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}30` }}>
            <ClipboardList size={20} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Forms, Surveys & Quizzes</h1>
            <p className="text-xs text-slate-500">Build and publish custom forms, surveys, and scored quizzes</p>
          </div>
        </div>
        <button onClick={createNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black" style={{ background: `linear-gradient(135deg,${GOLD},#F5C842)` }}>
          <Plus size={13} /> New Form
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 text-slate-600">
          <ClipboardList size={28} className="mb-2 opacity-40" />
          <p className="text-xs">No forms yet — create one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {forms.map((f) => (
            <div key={f.id} className="rounded-2xl border border-crm-border p-4 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-200 truncate">{f.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(212,175,55,0.1)", color: GOLD }}>{f.kind}</span>
              </div>
              <p className="text-[10px] text-slate-500">{f.fields.length} fields · {f.published ? <span style={{ color: EMERALD }}>Published</span> : "Draft"}</p>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => setEditing(f)} className="text-[11px] font-semibold" style={{ color: GOLD }}>Edit</button>
                {f.published && (
                  <button onClick={() => copyLink(f.slug)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200">
                    {copied === f.slug ? <Check size={11} /> : <Copy size={11} />} Link
                  </button>
                )}
                {f.published && (
                  <a href={`/forms/${f.slug}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300"><ExternalLink size={11} /></a>
                )}
                <button onClick={() => remove(f.id)} className="ml-auto text-rose-400 hover:text-rose-300"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
