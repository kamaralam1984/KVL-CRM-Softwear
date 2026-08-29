"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Layout, Plus, Eye, Edit2, Trash2, Copy, Globe,
  BarChart3, Check,
  Smartphone, Monitor, Tablet, Save, ExternalLink,
  Image, Type, Square, Columns, Star, GripVertical, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPages, savePage, publishPage, duplicatePage, deletePage, type PageRow } from "@/lib/actions/pages";
import { getAccessToken } from "@/lib/security/clientSession";
import {
  BLOCK_PALETTE, defaultBlockData, newBlockId,
  type BlockKind, type PlacedBlock, type PageBlockData,
} from "@/lib/pages/blocks";
import { BlockRenderer } from "@/components/pages/BlockRenderer";

const GOLD    = "#D4AF37";
const EMERALD = "#00A86B";

// Demo fallback — shown only when there are zero real pages yet (same "real
// when present, else the existing demo" convention as every other section).
const demoPages = [
  { id:1, name:"Lead Capture — Q4 Campaign", status:"Published", visits:2847, conversions:312, rate:"10.9%", template:"Lead Gen",  updated:"2h ago"  },
  { id:2, name:"Product Demo Request",        status:"Published", visits:1203, conversions:189, rate:"15.7%", template:"Demo",     updated:"1d ago"  },
  { id:3, name:"Free Trial Signup",           status:"Draft",     visits:0,    conversions:0,   rate:"—",    template:"Trial",    updated:"3d ago"  },
  { id:4, name:"Webinar Registration",        status:"Published", visits:4120, conversions:520, rate:"12.6%", template:"Event",   updated:"5d ago"  },
  { id:5, name:"Case Study Download",         status:"Paused",    visits:890,  conversions:67,  rate:"7.5%",  template:"Content", updated:"1w ago"  },
];

const templates = [
  { name:"Lead Generation",  desc:"Capture contact info with high-converting form", conversions:"12% avg", icon:"🎯" },
  { name:"Product Demo",     desc:"Book demos with calendar integration",           conversions:"18% avg", icon:"📅" },
  { name:"Free Trial",       desc:"Drive trial signups with value proposition",     conversions:"9% avg",  icon:"🚀" },
  { name:"Webinar / Event",  desc:"Event registration with countdown timer",        conversions:"14% avg", icon:"🎤" },
  { name:"Content Download", desc:"Gated content for lead magnets",                 conversions:"8% avg",  icon:"📄" },
  { name:"Sales Funnel",     desc:"Multi-step funnel with upsell pages",            conversions:"11% avg", icon:"🔄" },
];

const BLOCK_ICONS: Record<BlockKind, { icon: React.ElementType; color: string }> = {
  headline:    { icon: Type,     color: "#3b82f6" },
  paragraph:   { icon: Type,     color: "#6b7280" },
  button:      { icon: Square,   color: GOLD },
  image:       { icon: Image,    color: "#8b5cf6" },
  two_columns: { icon: Columns,  color: "#06b6d4" },
  form:        { icon: Layout,   color: EMERALD },
  testimonial: { icon: Star,     color: "#f59e0b" },
  stats_row:   { icon: BarChart3,color: "#ef4444" },
};

type ViewMode = "desktop" | "tablet" | "mobile";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "page";

function newDraftPage(): PageRow {
  return {
    id: 0,
    site_id: "kvl-default",
    name: "Untitled Page",
    url_path: `untitled-${Date.now().toString(36)}`,
    status: "draft",
    template: "",
    blocks: [],
    hits: 0,
    updated_at: new Date().toISOString(),
  };
}

// ─── Sortable canvas block ─────────────────────────────────────────────────
function SortableCanvasBlock({ block, selected, onSelect, onRemove }: {
  block: PlacedBlock; selected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} onClick={onSelect}
      className="rounded-xl p-4 cursor-pointer transition-all relative group"
      style={{
        ...style,
        background: selected ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
        border: selected ? "1px solid rgba(212,175,55,0.4)" : "1px dashed rgba(255,255,255,0.12)",
      }}>
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full pr-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300" title="Drag to reorder">
          <GripVertical size={14} />
        </button>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-lg bg-black/30 hover:bg-red-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <X size={11} className="text-slate-300" />
      </button>
      <div className="text-slate-200 text-sm" style={{ pointerEvents: "none" }}>
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}

// ─── Block properties editor ────────────────────────────────────────────────
function BlockEditor({ block, onChange }: { block: PlacedBlock; onChange: (data: PageBlockData) => void }) {
  const d = block.data;
  const field = (label: string, value: string, onSet: (v: string) => void) => (
    <div key={label} className="mb-2">
      <p className="text-[9px] text-slate-600 mb-1">{label}</p>
      <input value={value} onChange={(e) => onSet(e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-200 outline-none focus:border-amber-500/40" />
    </div>
  );

  if (d.kind === "headline") return <>{field("Headline", d.text, (v) => onChange({ ...d, text: v }))}{field("Subtext", d.subtext, (v) => onChange({ ...d, subtext: v }))}</>;
  if (d.kind === "paragraph") return field("Text", d.text, (v) => onChange({ ...d, text: v }));
  if (d.kind === "button") return <>{field("Label", d.text, (v) => onChange({ ...d, text: v }))}{field("Link (URL)", d.href, (v) => onChange({ ...d, href: v }))}</>;
  if (d.kind === "image") return <>{field("Image URL", d.src, (v) => onChange({ ...d, src: v }))}{field("Alt text", d.alt, (v) => onChange({ ...d, alt: v }))}</>;
  if (d.kind === "two_columns") return <>{field("Left column", d.left, (v) => onChange({ ...d, left: v }))}{field("Right column", d.right, (v) => onChange({ ...d, right: v }))}</>;
  if (d.kind === "form") return <>{field("Heading", d.heading, (v) => onChange({ ...d, heading: v }))}{field("Submit label", d.submitLabel, (v) => onChange({ ...d, submitLabel: v }))}<p className="text-[9px] text-slate-600 mt-1">Fields: {d.fields.join(", ")}</p></>;
  if (d.kind === "testimonial") return <>{field("Quote", d.quote, (v) => onChange({ ...d, quote: v }))}{field("Author", d.author, (v) => onChange({ ...d, author: v }))}</>;
  if (d.kind === "stats_row") return (
    <>
      {d.stats.map((s, i) => (
        <div key={i} className="grid grid-cols-2 gap-1.5 mb-2">
          <input value={s.value} onChange={(e) => { const stats = [...d.stats]; stats[i] = { ...s, value: e.target.value }; onChange({ ...d, stats }); }}
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-200 outline-none" placeholder="Value" />
          <input value={s.label} onChange={(e) => { const stats = [...d.stats]; stats[i] = { ...s, label: e.target.value }; onChange({ ...d, stats }); }}
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-200 outline-none" placeholder="Label" />
        </div>
      ))}
    </>
  );
  return null;
}

export default function KVlPages() {
  const [tab, setTab] = useState<"pages" | "builder" | "templates" | "analytics">("pages");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(false);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingPage, setEditingPage] = useState<PageRow>(newDraftPage());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    getPages(undefined, getAccessToken()).then((rows) => { setPages(rows); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const usingDemo = loaded && pages.length === 0;
  const displayPages = usingDemo ? demoPages : pages.map((p) => ({
    id: p.id, name: p.name || p.url_path, status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
    visits: p.hits, conversions: 0, rate: "—", template: p.template || "Custom",
    updated: new Date(p.updated_at).toLocaleDateString(),
  }));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function openBuilder(page?: PageRow) {
    setEditingPage(page ?? newDraftPage());
    setSelectedBlockId(null);
    setTab("builder");
  }

  const handleSave = async () => {
    const result = await savePage({
      id: editingPage.id || undefined,
      name: editingPage.name,
      urlPath: editingPage.url_path,
      template: editingPage.template,
      blocks: editingPage.blocks,
    }, getAccessToken());
    if (result) {
      setEditingPage(result);
      setPages((prev) => {
        const exists = prev.some((p) => p.id === result.id);
        return exists ? prev.map((p) => (p.id === result.id ? result : p)) : [result, ...prev];
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handlePublish = async () => {
    await handleSave();
    if (editingPage.id) {
      const res = await publishPage(editingPage.id, getAccessToken());
      if (res.ok) {
        setEditingPage((p) => ({ ...p, status: "published" }));
        setPages((prev) => prev.map((p) => (p.id === editingPage.id ? { ...p, status: "published" } : p)));
        setPublished(true);
        setTimeout(() => setPublished(false), 2500);
      }
    }
  };

  const handlePreview = (p: { id: number; name: string }) => {
    const real = pages.find((r) => r.id === p.id);
    const slug = real?.url_path ?? slugify(p.name);
    window.open(`/p/${slug}`, "_blank", "noopener,noreferrer");
  };

  const handleDuplicate = async (id: number) => {
    if (usingDemo) return; // demo rows have no real row to duplicate
    const copy = await duplicatePage(id, getAccessToken());
    if (copy) setPages((prev) => [copy, ...prev]);
  };

  const handleDelete = async (id: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this page? This cannot be undone.")) return;
    if (usingDemo) return;
    const res = await deletePage(id, getAccessToken());
    if (res.ok) setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const addBlock = (kind: BlockKind) => {
    const block: PlacedBlock = { id: newBlockId(), data: defaultBlockData(kind) };
    setEditingPage((p) => ({ ...p, blocks: [...p.blocks, block] }));
    setSelectedBlockId(block.id);
  };

  const removeBlock = (id: string) => {
    setEditingPage((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== id) }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const updateBlockData = (id: string, data: PageBlockData) => {
    setEditingPage((p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? { ...b, data } : b)) }));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setEditingPage((p) => {
      const oldIndex = p.blocks.findIndex((b) => b.id === active.id);
      const newIndex = p.blocks.findIndex((b) => b.id === over.id);
      return { ...p, blocks: arrayMove(p.blocks, oldIndex, newIndex) };
    });
  };

  const selectedBlock = editingPage.blocks.find((b) => b.id === selectedBlockId) ?? null;
  const totalVisits = displayPages.reduce((a, p) => a + p.visits, 0);
  const totalConversions = displayPages.reduce((a, p) => a + p.conversions, 0);
  const avgRate = usingDemo ? ((totalConversions / Math.max(totalVisits, 1)) * 100).toFixed(1) : "—";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD + "20", border:`1px solid ${GOLD}33` }}>
            <Layout size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Maxness Pages</h1>
            <p className="text-[10px] text-slate-500">Landing page builder & funnel creator{usingDemo ? " (demo data — build your first real page below)" : ""}</p>
          </div>
        </div>
        <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
          onClick={() => openBuilder()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black"
          style={{ background:`linear-gradient(135deg,${GOLD},#F5C842)` }}>
          <Plus size={13} /> New Page
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 pb-0 flex-shrink-0">
        {(["pages","templates","builder","analytics"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 rounded-t-xl text-xs font-semibold transition-all capitalize border-b-2",
              tab === t ? "text-white border-b-amber-400" : "text-slate-500 border-b-transparent hover:text-slate-300")}
            style={{ borderBottomColor: tab === t ? GOLD : "transparent" }}>
            {t === "builder" ? "Page Builder" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">

        {/* ── PAGES TAB ── */}
        {tab === "pages" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:"Total Pages",    val: displayPages.length.toString(),   color:"#3b82f6" },
                { label:"Total Visits",   val: totalVisits.toLocaleString(),  color: GOLD },
                { label:"Conversions",    val: totalConversions.toString(),   color: EMERALD },
                { label:"Avg Conv. Rate", val: avgRate + (avgRate === "—" ? "" : "%"), color:"#8b5cf6" },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-xl p-3 border border-crm-border text-center">
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
              <div className="px-4 py-3 border-b border-crm-border flex items-center justify-between">
                <p className="text-xs font-bold text-slate-200">Your Pages</p>
                <span className="text-[10px] text-slate-500">{displayPages.length} pages</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {["Page Name","Status","Visits","Conversions","Conv. Rate","Updated","Actions"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayPages.map((p, i) => (
                    <tr key={p.id} className={cn("border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors", i % 2 === 0 && "bg-white/[0.01]")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Globe size={12} className="text-slate-500" />
                          <span className="font-medium text-slate-200">{p.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Template: {p.template}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          p.status === "Published" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          p.status === "Draft"     ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.visits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{p.conversions}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: p.rate !== "—" ? EMERALD : "#64748b" }}>{p.rate}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[10px]">{p.updated}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openBuilder(usingDemo ? undefined : pages.find((r) => r.id === p.id))} className="w-6 h-6 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-white/[0.08] transition-colors" title="Edit">
                            <Edit2 size={10} className="text-slate-400" />
                          </button>
                          <button onClick={() => handlePreview(p)} className="w-6 h-6 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-white/[0.08] transition-colors" title="Preview">
                            <Eye size={10} className="text-slate-400" />
                          </button>
                          <button onClick={() => handleDuplicate(p.id)} className="w-6 h-6 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-white/[0.08] transition-colors" title="Duplicate">
                            <Copy size={10} className="text-slate-400" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="w-6 h-6 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors" title="Delete">
                            <Trash2 size={10} className="text-rose-400/70 hover:text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-200">Choose a Template to Start</p>
              <span className="text-xs text-slate-500">{templates.length} templates available</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <motion.div key={t.name} whileHover={{ y:-4 }} transition={{ duration:0.2 }}
                  className="glass-card rounded-2xl border border-crm-border overflow-hidden cursor-pointer group"
                  onClick={() => openBuilder({ ...newDraftPage(), template: t.name })}>
                  <div className="h-32 flex items-center justify-center text-4xl"
                    style={{ background:`linear-gradient(135deg,${GOLD}10,rgba(0,168,107,0.08))`, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    {t.icon}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-white">{t.name}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: EMERALD + "15", color: EMERALD }}>{t.conversions}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-3">{t.desc}</p>
                    <motion.button
                      whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                      className="w-full py-1.5 rounded-xl text-[11px] font-bold text-black opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background:`linear-gradient(135deg,${GOLD},#F5C842)` }}>
                      Use Template →
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── BUILDER TAB ── */}
        {tab === "builder" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input value={editingPage.name}
                  onChange={(e) => setEditingPage((p) => ({ ...p, name: e.target.value }))}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-white/[0.04] border border-crm-border text-slate-200 outline-none focus:border-amber-500/40 w-64" />
                <input value={editingPage.url_path}
                  onChange={(e) => setEditingPage((p) => ({ ...p, url_path: slugify(e.target.value) }))}
                  className="px-3 py-1.5 rounded-xl text-xs bg-white/[0.02] border border-crm-border text-slate-500 outline-none focus:border-amber-500/40 w-40" title="URL slug" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-crm-border">
                  {([["desktop", Monitor],["tablet", Tablet],["mobile", Smartphone]] as const).map(([mode, Icon]) => (
                    <button key={mode} onClick={() => setViewMode(mode as ViewMode)}
                      className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", viewMode === mode ? "bg-white/[0.08]" : "hover:bg-white/[0.04]")}>
                      <Icon size={13} style={{ color: viewMode === mode ? GOLD : "#64748b" }} />
                    </button>
                  ))}
                </div>
                <motion.button whileHover={{ scale:1.03 }} onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-crm-border text-slate-300 hover:bg-white/[0.04] transition-colors">
                  {saved ? <Check size={12} style={{ color: EMERALD }} /> : <Save size={12} />}
                  {saved ? "Saved!" : "Save Draft"}
                </motion.button>
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={handlePublish}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-black"
                  style={{ background: published ? `linear-gradient(135deg,${EMERALD},#00843D)` : `linear-gradient(135deg,${GOLD},#F5C842)` }}>
                  {published ? <><Check size={12} /> Published!</> : <><Globe size={12} /> Publish</>}
                </motion.button>
              </div>
            </div>

            <div className="flex gap-4 h-[520px]">
              {/* Left: Blocks palette — click to append */}
              <div className="w-44 flex-shrink-0 glass-card rounded-2xl border border-crm-border p-3 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Add Blocks</p>
                <div className="space-y-1.5">
                  {BLOCK_PALETTE.map(b => {
                    const { icon: Icon, color } = BLOCK_ICONS[b.kind];
                    return (
                      <motion.button key={b.kind} whileHover={{ x:2 }} transition={{ duration:0.15 }}
                        onClick={() => addBlock(b.kind)}
                        className="w-full flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06] text-left">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + "20" }}>
                          <Icon size={12} style={{ color }} />
                        </div>
                        <span className="text-[11px] text-slate-300">{b.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Center: Canvas — real, reorderable, persisted */}
              <div className="flex-1 glass-card rounded-2xl border border-crm-border overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-crm-border bg-white/[0.02]">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"/></div>
                  <div className="flex-1 px-3 py-1 rounded-md text-[10px] text-slate-500 bg-white/[0.03] border border-white/[0.05]">/p/{editingPage.url_path}</div>
                  <ExternalLink size={11} className="text-slate-600" />
                </div>
                <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: viewMode === "mobile" ? "375px" : viewMode === "tablet" ? "768px" : "100%", margin:"0 auto", width:"100%" }}>
                  {editingPage.blocks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-600">
                      <Layout size={28} className="mb-2 opacity-50" />
                      <p className="text-xs">Click a block on the left to add it here.</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                      <SortableContext items={editingPage.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                          {editingPage.blocks.map((block) => (
                            <SortableCanvasBlock
                              key={block.id}
                              block={block}
                              selected={selectedBlockId === block.id}
                              onSelect={() => setSelectedBlockId(block.id)}
                              onRemove={() => removeBlock(block.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>

              {/* Right: Properties panel — edits the selected block for real */}
              <div className="w-52 flex-shrink-0 glass-card rounded-2xl border border-crm-border p-3 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {selectedBlock ? "Block Settings" : "Page Settings"}
                </p>
                {selectedBlock ? (
                  <BlockEditor block={selectedBlock} onChange={(data) => updateBlockData(selectedBlock.id, data)} />
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] text-slate-600 mb-1">Template</p>
                      <div className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300">{editingPage.template || "Custom"}</div>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 mb-1">Status</p>
                      <div className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300 capitalize">{editingPage.status}</div>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 mb-1">CRM Integration</p>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <span className="text-[10px] text-slate-300">Form block → CRM lead</span>
                        <div className="w-7 h-4 rounded-full bg-emerald-500/60 flex items-center justify-end pr-0.5">
                          <div className="w-3 h-3 rounded-full bg-white" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-600 leading-relaxed">Click a block on the canvas to edit its content, or drag its grip handle to reorder.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl border border-crm-border p-5">
              <p className="text-xs font-bold text-slate-200 mb-4">Page Performance</p>
              <div className="space-y-3">
                {displayPages.filter(p => p.status === "Published").map(p => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300">{p.name}</span>
                      <span className="text-xs font-bold" style={{ color: EMERALD }}>{p.rate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div initial={{ width:0 }} animate={{ width: p.rate !== "—" ? p.rate : "0%" }}
                          transition={{ duration:0.8, ease:"easeOut" }}
                          className="h-full rounded-full" style={{ background:`linear-gradient(90deg,${GOLD},${EMERALD})` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 w-20 text-right">{p.visits.toLocaleString()} visits</span>
                    </div>
                  </div>
                ))}
                {displayPages.filter(p => p.status === "Published").length === 0 && (
                  <p className="text-xs text-slate-600">Publish a page to see its performance here.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
