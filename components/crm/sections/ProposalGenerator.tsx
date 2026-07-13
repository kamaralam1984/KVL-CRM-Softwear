"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileSignature,
  ShieldCheck,
  Receipt,
  ScrollText,
  Wrench,
  Plus,
  Trash2,
  Download,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, SectionHeader, EmptyState } from "@/components/ui";
import type { DocType, DocInput } from "@/lib/documents/types";

const inputCls =
  "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";

const docTypes: { type: DocType; label: string; icon: typeof FileText }[] = [
  { type: "proposal", label: "Proposal", icon: FileText },
  { type: "quotation", label: "Quotation", icon: ScrollText },
  { type: "invoice", label: "Invoice", icon: Receipt },
  { type: "agreement", label: "Agreement", icon: FileSignature },
  { type: "nda", label: "NDA", icon: ShieldCheck },
  { type: "amc", label: "AMC", icon: Wrench },
];

type LineItem = { name: string; price: string };

export default function ProposalGenerator() {
  const [docType, setDocType] = useState<DocType>("proposal");
  const [company, setCompany] = useState("");
  const [clientName, setClientName] = useState("");
  const [senderCompany, setSenderCompany] = useState("");
  const [senderName, setSenderName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", price: "" }]);

  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const total = items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0);

  const setItem = (idx: number, key: keyof LineItem, value: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  const addItem = () => setItems((prev) => [...prev, { name: "", price: "" }]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const generate = async () => {
    if (!company.trim()) {
      setError("Company name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const services = items
        .filter((it) => it.name.trim())
        .map((it) => ({ name: it.name.trim(), price: parseFloat(it.price) || 0 }));

      const input: DocInput = {
        type: docType,
        company: company.trim(),
        clientName: clientName.trim() || undefined,
        senderCompany: senderCompany.trim() || undefined,
        senderName: senderName.trim() || undefined,
        services: services.length ? services : undefined,
        total: services.length ? total : undefined,
        notes: notes.trim() || undefined,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };

      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, format: "html" }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const text = await res.text();
      setHtml(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate document.");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!html) return;
    try {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeCompany = (company.trim() || "document").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
      a.download = `${docType}-${safeCompany}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not start download.");
    }
  };

  return (
    <div className="p-5 h-full overflow-y-auto space-y-4">
      <SectionHeader
        title="Document Generator"
        subtitle="Create proposals, quotations, invoices, agreements, NDAs and AMC contracts."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Form */}
        <Card title="Details" icon={<Sparkles size={15} className="text-blue-400" />}>
          <div className="space-y-4">
            {/* Doc type selector */}
            <div>
              <label className="text-[11px] text-slate-500 mb-1.5 block">Document Type</label>
              <div className="grid grid-cols-3 gap-2">
                {docTypes.map((d) => {
                  const Icon = d.icon;
                  const active = docType === d.type;
                  return (
                    <button
                      key={d.type}
                      type="button"
                      onClick={() => setDocType(d.type)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] transition-colors",
                        active
                          ? "gradient-bg text-white border-transparent"
                          : "border-crm-border text-slate-400 hover:bg-white/[0.04]"
                      )}
                    >
                      <Icon size={15} />
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Company / Recipient *</label>
                <input
                  className={inputCls}
                  placeholder="TechNova Inc"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Client Name</label>
                <input
                  className={inputCls}
                  placeholder="Jane Doe"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Your Company</label>
                <input
                  className={inputCls}
                  placeholder="Freedom With AI"
                  value={senderCompany}
                  onChange={(e) => setSenderCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Your Name</label>
                <input
                  className={inputCls}
                  placeholder="Animesh"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-500">Line Items</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className={cn(inputCls, "flex-1")}
                      placeholder="Service name"
                      aria-label={`Line item ${i + 1} name`}
                      value={it.name}
                      onChange={(e) => setItem(i, "name", e.target.value)}
                    />
                    <input
                      className={cn(inputCls, "w-28")}
                      type="number"
                      min="0"
                      placeholder="Price"
                      aria-label={`Line item ${i + 1} price`}
                      value={it.price}
                      onChange={(e) => setItem(i, "price", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      aria-label={`Remove line item ${i + 1}`}
                      className="p-2 rounded-lg border border-crm-border text-slate-500 hover:text-rose-400 hover:border-rose-500/30 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[11px] text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-100">{formatCurrency(total)}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Notes</label>
              <textarea
                className={cn(inputCls, "resize-none")}
                rows={3}
                placeholder="Optional terms, scope or remarks…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button
              type="button"
              onClick={generate}
              disabled={loading || !company.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40 transition-opacity"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? "Generating…" : "Generate Document"}
            </button>
          </div>
        </Card>

        {/* Preview */}
        <Card
          title="Preview"
          icon={<FileText size={15} className="text-emerald-400" />}
          actions={
            html ? (
              <button
                type="button"
                onClick={download}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
              >
                <Download size={12} /> Download
              </button>
            ) : undefined
          }
        >
          {html ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="rounded-xl border border-crm-border overflow-hidden bg-white">
                <iframe
                  srcDoc={html}
                  title="Document preview"
                  className="w-full"
                  style={{ minHeight: 500, border: "none", background: "#fff" }}
                />
              </div>
              <p className="text-[10px] text-slate-600">
                Tip: open the downloaded HTML in a browser and Print → “Save as PDF” to export a PDF.
              </p>
            </motion.div>
          ) : (
            <div className="min-h-[500px] flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 size={22} className="animate-spin text-blue-400" />
                  <span className="text-xs">Generating your document…</span>
                </div>
              ) : (
                <EmptyState
                  icon={<FileText size={22} />}
                  title="No document yet"
                  hint="Fill in the details and hit Generate Document to see a live preview here."
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
