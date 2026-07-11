"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Package, Users, BarChart3, TrendingUp, TrendingDown,
  Clock, CheckCircle, Truck, AlertTriangle, Plus, Search,
  Download, Printer, Crown, Eye,
  RefreshCw, Send, RotateCcw, Grid, List, Upload, ArrowRight,
  DollarSign, ShoppingCart, Star, LayoutDashboard,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Refunded";
type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

interface OrderItem { name: string; qty: number; price: number }
interface Order {
  id: string; customer: string; email: string; items: OrderItem[];
  amount: number; payment: string; shipping: string;
  status: OrderStatus; date: string;
}
interface Product {
  id: string; name: string; sku: string; price: number; stock: number;
  reorder: number; category: string; color: string;
}
interface Customer {
  id: string; name: string; email: string; avatar: string;
  orders: number; spent: number; lastOrder: string; ltv: number;
  segment: "New" | "Returning" | "VIP" | "At Risk";
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const ORDERS: Order[] = [
  { id: "#VC-1042", customer: "Sarah Mitchell",  email: "sarah@example.com",  items: [{ name: "Pro Wireless Headphones", qty: 1, price: 149 }, { name: "USB-C Cable 2m", qty: 2, price: 12 }],  amount: 173,  payment: "Visa ····4242", shipping: "FedEx",  status: "Delivered",   date: "Jun 2, 2026" },
  { id: "#VC-1041", customer: "James Okafor",    email: "james@example.com",  items: [{ name: "Mechanical Keyboard RGB", qty: 1, price: 229 }],                                                  amount: 229,  payment: "PayPal",       shipping: "UPS",    status: "Shipped",     date: "Jun 2, 2026" },
  { id: "#VC-1040", customer: "Priya Sharma",    email: "priya@example.com",  items: [{ name: "KVl T-Shirt XL", qty: 3, price: 34 }, { name: "KVl Cap", qty: 1, price: 22 }],              amount: 124,  payment: "Stripe",       shipping: "DHL",    status: "Processing",  date: "Jun 1, 2026" },
  { id: "#VC-1039", customer: "Luca Rossi",      email: "luca@example.com",   items: [{ name: "AI Starter Course", qty: 1, price: 499 }],                                                        amount: 499,  payment: "Visa ····9812", shipping: "Digital", status: "Delivered",   date: "Jun 1, 2026" },
  { id: "#VC-1038", customer: "Emma Johnson",    email: "emma@example.com",   items: [{ name: "Smart Watch Series 5", qty: 1, price: 389 }],                                                     amount: 389,  payment: "Mastercard",   shipping: "FedEx",  status: "Pending",     date: "May 31, 2026" },
  { id: "#VC-1037", customer: "Carlos Mendez",   email: "carlos@example.com", items: [{ name: "KVl Hoodie M", qty: 2, price: 59 }],                                                           amount: 118,  payment: "Apple Pay",    shipping: "USPS",   status: "Pending",     date: "May 31, 2026" },
  { id: "#VC-1036", customer: "Aisha Williams",  email: "aisha@example.com",  items: [{ name: "Cloud Storage 1TB Plan", qty: 1, price: 99 }],                                                    amount: 99,   payment: "Stripe",       shipping: "Digital", status: "Delivered",   date: "May 30, 2026" },
  { id: "#VC-1035", customer: "Noah Park",       email: "noah@example.com",   items: [{ name: "Gaming Mouse Pro", qty: 1, price: 79 }, { name: "Mouse Pad XL", qty: 1, price: 29 }],            amount: 108,  payment: "Visa ····3391", shipping: "UPS",    status: "Shipped",     date: "May 30, 2026" },
  { id: "#VC-1034", customer: "Fatima Al-Hassan",email: "fatima@example.com", items: [{ name: "Pro Wireless Headphones", qty: 2, price: 149 }],                                                  amount: 298,  payment: "PayPal",       shipping: "FedEx",  status: "Refunded",    date: "May 29, 2026" },
  { id: "#VC-1033", customer: "Björn Larsen",    email: "bjorn@example.com",  items: [{ name: "AI Starter Course", qty: 1, price: 499 }, { name: "AI Advanced Module", qty: 1, price: 299 }],   amount: 798,  payment: "Stripe",       shipping: "Digital", status: "Delivered",   date: "May 29, 2026" },
  { id: "#VC-1032", customer: "Yuki Tanaka",     email: "yuki@example.com",   items: [{ name: "Mechanical Keyboard RGB", qty: 1, price: 229 }],                                                  amount: 229,  payment: "Visa ····7720", shipping: "DHL",    status: "Processing",  date: "May 28, 2026" },
  { id: "#VC-1031", customer: "Marcus Chen",     email: "marcus@example.com", items: [{ name: "Smart Watch Series 5", qty: 1, price: 389 }, { name: "Watch Band Sport", qty: 2, price: 19 }],   amount: 427,  payment: "Mastercard",   shipping: "UPS",    status: "Processing",  date: "May 28, 2026" },
];

const PRODUCTS: Product[] = [
  { id: "p1", name: "Pro Wireless Headphones", sku: "HDP-001",  price: 149, stock: 42,  reorder: 20, category: "Electronics", color: "#6366f1" },
  { id: "p2", name: "Mechanical Keyboard RGB",  sku: "KBD-004",  price: 229, stock: 8,   reorder: 15, category: "Electronics", color: "#8b5cf6" },
  { id: "p3", name: "Gaming Mouse Pro",         sku: "MOU-007",  price: 79,  stock: 31,  reorder: 10, category: "Electronics", color: "#ec4899" },
  { id: "p4", name: "Smart Watch Series 5",     sku: "WCH-012",  price: 389, stock: 0,   reorder: 5,  category: "Electronics", color: "#f59e0b" },
  { id: "p5", name: "KVl T-Shirt XL",        sku: "TSH-XL-3", price: 34,  stock: 156, reorder: 30, category: "Clothing",    color: "#10b981" },
  { id: "p6", name: "KVl Hoodie M",          sku: "HOD-M-1",  price: 59,  stock: 7,   reorder: 15, category: "Clothing",    color: "#06b6d4" },
  { id: "p7", name: "KVl Cap",               sku: "CAP-001",  price: 22,  stock: 88,  reorder: 20, category: "Clothing",    color: "#84cc16" },
  { id: "p8", name: "AI Starter Course",        sku: "CRS-AI-1", price: 499, stock: 999, reorder: 0,  category: "Software",    color: "#D4AF37" },
  { id: "p9", name: "AI Advanced Module",       sku: "CRS-AI-2", price: 299, stock: 999, reorder: 0,  category: "Software",    color: "#f97316" },
  { id: "p10",name: "Cloud Storage 1TB Plan",   sku: "SVC-CLD-1",price: 99,  stock: 999, reorder: 0,  category: "Services",    color: "#00A86B" },
  { id: "p11",name: "USB-C Cable 2m",           sku: "CBL-UC-2",  price: 12,  stock: 3,   reorder: 50, category: "Electronics", color: "#ef4444" },
  { id: "p12",name: "Mouse Pad XL",             sku: "PAD-XL-1",  price: 29,  stock: 24,  reorder: 10, category: "Electronics", color: "#a855f7" },
];

const CUSTOMERS: Customer[] = [
  { id: "c1", name: "Björn Larsen",     email: "bjorn@example.com",    avatar: "BL", orders: 14, spent: 4892, lastOrder: "May 29", ltv: 7200,  segment: "VIP" },
  { id: "c2", name: "Luca Rossi",       email: "luca@example.com",     avatar: "LR", orders: 11, spent: 3840, lastOrder: "Jun 1",  ltv: 5500,  segment: "VIP" },
  { id: "c3", name: "Sarah Mitchell",   email: "sarah@example.com",    avatar: "SM", orders: 8,  spent: 1240, lastOrder: "Jun 2",  ltv: 2100,  segment: "Returning" },
  { id: "c4", name: "Marcus Chen",      email: "marcus@example.com",   avatar: "MC", orders: 7,  spent: 1980, lastOrder: "May 28", ltv: 3000,  segment: "Returning" },
  { id: "c5", name: "Aisha Williams",   email: "aisha@example.com",    avatar: "AW", orders: 5,  spent: 720,  lastOrder: "May 30", ltv: 1200,  segment: "Returning" },
  { id: "c6", name: "Noah Park",        email: "noah@example.com",     avatar: "NP", orders: 3,  spent: 340,  lastOrder: "May 30", ltv: 600,   segment: "New" },
  { id: "c7", name: "Priya Sharma",     email: "priya@example.com",    avatar: "PS", orders: 2,  spent: 248,  lastOrder: "Jun 1",  ltv: 400,   segment: "New" },
  { id: "c8", name: "Carlos Mendez",    email: "carlos@example.com",   avatar: "CM", orders: 6,  spent: 890,  lastOrder: "May 31", ltv: 1400,  segment: "At Risk" },
  { id: "c9", name: "Fatima Al-Hassan", email: "fatima@example.com",   avatar: "FA", orders: 4,  spent: 680,  lastOrder: "May 29", ltv: 1100,  segment: "At Risk" },
  { id: "c10",name: "Yuki Tanaka",      email: "yuki@example.com",     avatar: "YT", orders: 1,  spent: 229,  lastOrder: "May 28", ltv: 300,   segment: "New" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const GOLD = "#D4AF37";
const EMERALD = "#00A86B";

function statusColor(s: OrderStatus) {
  return {
    Pending:    { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
    Processing: { bg: "rgba(99,102,241,0.12)",  text: "#818cf8", border: "rgba(99,102,241,0.3)" },
    Shipped:    { bg: "rgba(6,182,212,0.12)",   text: "#22d3ee", border: "rgba(6,182,212,0.3)" },
    Delivered:  { bg: "rgba(0,168,107,0.12)",   text: "#00A86B", border: "rgba(0,168,107,0.3)" },
    Refunded:   { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)" },
  }[s];
}

function stockStatus(p: Product): StockStatus {
  if (p.stock === 0) return "Out of Stock";
  if (p.stock <= p.reorder) return "Low Stock";
  return "In Stock";
}

function stockColor(s: StockStatus) {
  return {
    "In Stock":      { bg: "rgba(0,168,107,0.12)",  text: "#00A86B", border: "rgba(0,168,107,0.3)" },
    "Low Stock":     { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
    "Out of Stock":  { bg: "rgba(239,68,68,0.12)",  text: "#f87171", border: "rgba(239,68,68,0.3)" },
  }[s];
}

function segmentColor(seg: Customer["segment"]) {
  return {
    VIP:       { bg: "rgba(212,175,55,0.12)",  text: GOLD,      border: "rgba(212,175,55,0.3)" },
    Returning: { bg: "rgba(0,168,107,0.12)",   text: EMERALD,   border: "rgba(0,168,107,0.3)" },
    New:       { bg: "rgba(99,102,241,0.12)",  text: "#818cf8", border: "rgba(99,102,241,0.3)" },
    "At Risk": { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)" },
  }[seg];
}

const WEEK_REVENUE = [18200, 21400, 19800, 24600, 22100, 26800, 28450];
const WEEK_LABELS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AOV_TREND    = [198, 212, 205, 231, 218, 244, 238];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Badge({ label, bg, text, border }: { label: string; bg: string; text: string; border: string }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: bg, color: text, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}

function CSSBar({ value, max, color, label, sub }: { value: number; max: number; color: string; label: string; sub?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-semibold">{sub ?? value}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-2 rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const recentOrders = ORDERS.slice(0, 5);
  const lowStock = PRODUCTS.filter(p => stockStatus(p) !== "In Stock").slice(0, 3);
  const maxBar = Math.max(...WEEK_REVENUE);

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today"      value="$4,280"   sub="+12% vs yesterday"    icon={DollarSign} color={GOLD} />
        <StatCard label="This Week"  value="$28,450"  sub="+8% vs last week"     icon={TrendingUp}  color={EMERALD} />
        <StatCard label="This Month" value="$112,800" sub="74% of monthly goal"  icon={BarChart3}   color="#818cf8" />
        <StatCard label="YTD"        value="$890,400" sub="On track for $1.1M"   icon={Star}        color="#22d3ee" />
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending",    count: 8,   icon: Clock,         color: "#fbbf24" },
          { label: "Processing", count: 14,  icon: RefreshCw,     color: "#818cf8" },
          { label: "Shipped",    count: 32,  icon: Truck,         color: "#22d3ee" },
          { label: "Delivered",  count: 156, icon: CheckCircle,   color: EMERALD  },
        ].map(o => (
          <div key={o.label} className="rounded-xl p-4 border text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${o.color}18` }}>
              <o.icon size={18} style={{ color: o.color }} />
            </div>
            <p className="text-2xl font-black text-white">{o.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{o.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map(o => {
              const sc = statusColor(o.status);
              return (
                <div key={o.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
                    <ShoppingCart size={13} style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: GOLD }}>{o.id}</span>
                      <span className="text-xs text-slate-400 truncate">{o.customer}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{o.items.map(i => i.name).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-white">${o.amount}</span>
                    <Badge label={o.status} {...sc} />
                    <span className="text-[11px] text-slate-600">{o.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock + Chart */}
        <div className="space-y-4">
          {/* Low Stock */}
          <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} style={{ color: "#fbbf24" }} />
              <h3 className="text-sm font-semibold text-slate-200">Low Stock Alerts</h3>
            </div>
            {lowStock.map(p => {
              const ss = stockStatus(p);
              const sc = stockColor(ss);
              return (
                <div key={p.id} className="flex items-center gap-2 py-2 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="w-7 h-7 rounded flex-shrink-0" style={{ background: p.color + "40" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-600">{p.sku} · Reorder: {p.reorder}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: sc.text }}>{p.stock}</p>
                    <p className="text-[10px] text-slate-600">left</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7-day Revenue Chart */}
          <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Revenue · Last 7 Days</h3>
            <div className="flex items-end gap-1.5 h-20">
              {WEEK_REVENUE.map((v, i) => {
                const pct = (v / maxBar) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.07 }}
                      className="w-full rounded-t-sm"
                      style={{ background: i === 6 ? GOLD : `${GOLD}50`, minHeight: 4 }}
                    />
                    <span className="text-[9px] text-slate-600">{WEEK_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Orders ───────────────────────────────────────────────────────────────

function OrdersTab() {
  const [filter, setFilter] = useState<OrderStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const statuses: (OrderStatus | "All")[] = ["All", "Pending", "Processing", "Shipped", "Delivered", "Refunded"];

  const filtered = ORDERS.filter(o => {
    if (filter !== "All" && o.status !== filter) return false;
    if (search && !o.customer.toLowerCase().includes(search.toLowerCase()) && !o.id.includes(search)) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={filter === s ? { background: GOLD, color: "#000" } : { color: "#94a3b8" }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1 relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search orders or customer…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-300 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} />
        </div>
        <input type="date" className="px-3 py-1.5 rounded-lg text-xs text-slate-400 outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} />
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">{selected.size} selected</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(0,168,107,0.12)", color: EMERALD, border: `1px solid rgba(0,168,107,0.25)` }}>
              <Download size={12} /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(212,175,55,0.08)", color: GOLD, border: `1px solid rgba(212,175,55,0.2)` }}>
              <Printer size={12} /> Print Labels
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="p-3 w-8">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll} className="accent-yellow-500" />
              </th>
              {["Order #", "Customer", "Items", "Amount", "Payment", "Shipping", "Status", "Date", "Actions"].map(h => (
                <th key={h} className="p-3 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const sc = statusColor(o.status);
              const isExpanded = expanded === o.id;
              return (
                <>
                  <tr key={o.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="accent-yellow-500" />
                    </td>
                    <td className="p-3 font-semibold" style={{ color: GOLD }}>{o.id}</td>
                    <td className="p-3">
                      <div>
                        <p className="text-slate-200 font-medium">{o.customer}</p>
                        <p className="text-slate-600 text-[10px]">{o.email}</p>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400">{o.items.length} item{o.items.length > 1 ? "s" : ""}</td>
                    <td className="p-3 font-bold text-white">${o.amount}</td>
                    <td className="p-3 text-slate-400">{o.payment}</td>
                    <td className="p-3 text-slate-400">{o.shipping}</td>
                    <td className="p-3"><Badge label={o.status} {...sc} /></td>
                    <td className="p-3 text-slate-500">{o.date}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpanded(isExpanded ? null : o.id)}
                          className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-colors" title="View">
                          <Eye size={13} />
                        </button>
                        {o.status === "Pending" && (
                          <button className="p-1 rounded hover:bg-indigo-500/20 text-indigo-400 transition-colors" title="Process"><RefreshCw size={13} /></button>
                        )}
                        {o.status === "Processing" && (
                          <button className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 transition-colors" title="Ship"><Send size={13} /></button>
                        )}
                        {(o.status === "Delivered" || o.status === "Shipped") && (
                          <button className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors" title="Refund"><RotateCcw size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr key={`${o.id}-exp`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={10} className="px-6 pb-4 pt-0">
                          <div className="rounded-lg p-4" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Order Items</p>
                            <div className="space-y-2">
                              {o.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-300">{item.name}</span>
                                  <span className="text-slate-500">×{item.qty}</span>
                                  <span className="font-semibold text-white">${(item.qty * item.price).toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-xs pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                                <span className="font-semibold text-slate-300">Total</span>
                                <span className="font-black" style={{ color: GOLD }}>${o.amount}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Products ─────────────────────────────────────────────────────────────

function ProductsTab() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: "", stock: "", category: "Electronics", description: "" });

  const cats = ["All", "Electronics", "Clothing", "Software", "Services"];
  const filtered = catFilter === "All" ? PRODUCTS : PRODUCTS.filter(p => p.category === catFilter);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={catFilter === c ? { background: GOLD, color: "#000" } : { color: "#94a3b8" }}>
              {c}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setViewMode("grid")} className="p-1.5 rounded-md transition-colors"
            style={{ background: viewMode === "grid" ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)", color: viewMode === "grid" ? GOLD : "#64748b" }}>
            <Grid size={14} />
          </button>
          <button onClick={() => setViewMode("list")} className="p-1.5 rounded-md transition-colors"
            style={{ background: viewMode === "list" ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)", color: viewMode === "list" ? GOLD : "#64748b" }}>
            <List size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: GOLD, color: "#000" }}>
            <Plus size={13} /> Add Product
          </button>
        </div>
      </div>

      {/* Grid / List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map(p => {
            const ss = stockStatus(p);
            const sc = stockColor(ss);
            return (
              <motion.div key={p.id} whileHover={{ y: -2 }}
                className="rounded-xl border p-4 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="w-full h-24 rounded-lg mb-3 flex items-center justify-center" style={{ background: p.color + "22" }}>
                  <Package size={28} style={{ color: p.color + "cc" }} />
                </div>
                <p className="text-sm font-semibold text-slate-200 truncate">{p.name}</p>
                <p className="text-[10px] text-slate-600 mb-2">{p.sku}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black" style={{ color: GOLD }}>${p.price}</span>
                  <Badge label={ss} {...sc} />
                </div>
                <p className="text-[10px] text-slate-600 mt-1">{p.category} · {p.stock} in stock</p>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["", "Name", "SKU", "Price", "Stock", "Category", "Status"].map(h => (
                  <th key={h} className="p-3 text-left font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const ss = stockStatus(p);
                const sc = stockColor(ss);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="p-3">
                      <div className="w-8 h-8 rounded-lg" style={{ background: p.color + "33" }} />
                    </td>
                    <td className="p-3 font-medium text-slate-200">{p.name}</td>
                    <td className="p-3 text-slate-500">{p.sku}</td>
                    <td className="p-3 font-bold" style={{ color: GOLD }}>${p.price}</td>
                    <td className="p-3 text-slate-300">{p.stock}</td>
                    <td className="p-3 text-slate-400">{p.category}</td>
                    <td className="p-3"><Badge label={ss} {...sc} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product slide-in */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-96 z-50 flex flex-col overflow-y-auto"
              style={{ background: "#0d1424", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h3 className="font-bold text-slate-100">Add New Product</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-200 text-lg leading-none">×</button>
              </div>
              <div className="p-5 space-y-4">
                {/* Image Upload */}
                <div className="w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-yellow-500/40 transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
                  <Upload size={20} className="text-slate-600" />
                  <p className="text-xs text-slate-500">Click to upload product image</p>
                </div>
                {[
                  { label: "Product Name", key: "name", placeholder: "e.g. Pro Wireless Headphones" },
                  { label: "SKU",          key: "sku",  placeholder: "e.g. HDP-001" },
                  { label: "Price ($)",    key: "price",placeholder: "0.00" },
                  { label: "Stock",        key: "stock",placeholder: "0" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                    <input value={(form as Record<string,string>)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg text-sm text-slate-300 outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-slate-300 outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Electronics", "Clothing", "Software", "Services"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} placeholder="Product description…"
                    className="w-full px-3 py-2 rounded-lg text-sm text-slate-300 outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{ background: GOLD, color: "#000" }}>
                  Save Product
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Customers ────────────────────────────────────────────────────────────

function CustomersTab() {
  const [activeCust, setActiveCust] = useState<Customer | null>(null);

  return (
    <div className="flex gap-4">
      {/* Table */}
      <div className="flex-1 rounded-xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-slate-200">All Customers</h3>
          <div className="flex gap-2">
            {(["New","Returning","VIP","At Risk"] as const).map(seg => {
              const sc = segmentColor(seg);
              return <Badge key={seg} label={seg} {...sc} />;
            })}
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Customer", "Orders", "Total Spent", "Last Order", "LTV", "Segment"].map(h => (
                <th key={h} className="p-3 text-left font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CUSTOMERS.map(c => {
              const sc = segmentColor(c.segment);
              const isVIP = c.segment === "VIP";
              return (
                <tr key={c.id}
                  onClick={() => setActiveCust(activeCust?.id === c.id ? null : c)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: activeCust?.id === c.id ? "rgba(212,175,55,0.04)" : "transparent",
                  }}
                  onMouseEnter={e => { if (activeCust?.id !== c.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { if (activeCust?.id !== c.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#006B3C,#00A86B)" }}>
                        {c.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-200">{c.name}</span>
                          {isVIP && <Crown size={11} style={{ color: GOLD }} />}
                        </div>
                        <p className="text-[10px] text-slate-600">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">{c.orders}</td>
                  <td className="p-3 font-semibold text-white">${c.spent.toLocaleString()}</td>
                  <td className="p-3 text-slate-400">{c.lastOrder}</td>
                  <td className="p-3 font-bold" style={{ color: GOLD }}>${c.ltv.toLocaleString()}</td>
                  <td className="p-3"><Badge label={c.segment} {...sc} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sidebar: Purchase History */}
      <AnimatePresence>
        {activeCust && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="w-72 flex-shrink-0 rounded-xl border p-4 space-y-4"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: "linear-gradient(135deg,#006B3C,#00A86B)" }}>
                {activeCust.avatar}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-slate-100">{activeCust.name}</p>
                  {activeCust.segment === "VIP" && <Crown size={12} style={{ color: GOLD }} />}
                </div>
                <p className="text-[10px] text-slate-500">{activeCust.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Orders",      value: activeCust.orders },
                { label: "Spent",       value: `$${activeCust.spent.toLocaleString()}` },
                { label: "LTV",         value: `$${activeCust.ltv.toLocaleString()}` },
                { label: "Last Order",  value: activeCust.lastOrder },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-slate-600">{s.label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Purchase History</p>
              <div className="space-y-2">
                {ORDERS.filter(o => o.customer === activeCust.name).map(o => {
                  const sc = statusColor(o.status);
                  return (
                    <div key={o.id} className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold" style={{ color: GOLD }}>{o.id}</span>
                        <Badge label={o.status} {...sc} />
                      </div>
                      <p className="text-[10px] text-slate-500">{o.date}</p>
                      <p className="text-xs font-bold text-white mt-0.5">${o.amount}</p>
                    </div>
                  );
                })}
                {ORDERS.filter(o => o.customer === activeCust.name).length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-3">No orders found</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Analytics ────────────────────────────────────────────────────────────

const CAT_REVENUE = [
  { cat: "Software",    rev: 48200, color: GOLD },
  { cat: "Electronics", rev: 37600, color: "#818cf8" },
  { cat: "Services",    rev: 15400, color: EMERALD },
  { cat: "Clothing",    rev: 11600, color: "#22d3ee" },
];

const TOP_PRODUCTS = [
  { name: "AI Starter Course",        sales: 87 },
  { name: "Pro Wireless Headphones",  sales: 64 },
  { name: "Smart Watch Series 5",     sales: 51 },
  { name: "Mechanical Keyboard RGB",  sales: 43 },
  { name: "AI Advanced Module",       sales: 38 },
];

const FUNNEL = [
  { stage: "Visitors",   count: 12400 },
  { stage: "Cart",       count: 3720  },
  { stage: "Checkout",   count: 1580  },
  { stage: "Purchased",  count: 892   },
];

function AnalyticsTab() {
  const maxCat = Math.max(...CAT_REVENUE.map(c => c.rev));
  const maxProd = Math.max(...TOP_PRODUCTS.map(p => p.sales));
  const maxAOV = Math.max(...AOV_TREND);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Revenue by Category */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Revenue by Category</h3>
        {CAT_REVENUE.map(c => (
          <CSSBar key={c.cat} label={c.cat} value={c.rev} max={maxCat} color={c.color} sub={`$${c.rev.toLocaleString()}`} />
        ))}
      </div>

      {/* Top Selling Products */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Top Selling Products</h3>
        {TOP_PRODUCTS.map((p, i) => (
          <div key={p.name} className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold w-4 text-slate-600">#{i + 1}</span>
            <div className="flex-1">
              <CSSBar label={p.name} value={p.sales} max={maxProd} color={GOLD} sub={`${p.sales} sold`} />
            </div>
          </div>
        ))}
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Order Conversion Funnel</h3>
        <div className="space-y-2">
          {FUNNEL.map((f, i) => {
            const pct = Math.round((f.count / FUNNEL[0].count) * 100);
            const opacity = 1 - i * 0.18;
            return (
              <div key={f.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    {i > 0 && <ArrowRight size={10} className="text-slate-600" />}
                    {f.stage}
                  </span>
                  <span className="text-slate-200 font-semibold">{f.count.toLocaleString()} <span className="text-slate-600">({pct}%)</span></span>
                </div>
                <div className="h-3 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.1 }}
                    className="h-3 rounded-full"
                    style={{ background: EMERALD, opacity }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Conversion rate: <span className="font-bold" style={{ color: EMERALD }}>7.2%</span>
        </p>
      </div>

      {/* AOV Trend + Refund Rate */}
      <div className="space-y-4">
        {/* AOV */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Avg Order Value · 7 Days</h3>
          <div className="flex items-end gap-1.5 h-20">
            {AOV_TREND.map((v, i) => {
              const pct = (v / maxAOV) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.07 }}
                    className="w-full rounded-t-sm"
                    style={{ background: i === 6 ? EMERALD : `${EMERALD}50`, minHeight: 4 }}
                  />
                  <span className="text-[9px] text-slate-600">{WEEK_LABELS[i]}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">Current AOV: <span className="font-bold text-white">${AOV_TREND[6]}</span></p>
        </div>

        {/* Refund Rate */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">Refund Rate</h3>
            <div className="flex items-center gap-1 text-xs" style={{ color: EMERALD }}>
              <TrendingDown size={12} />
              <span>-0.4% vs last month</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-black text-white">2.3<span className="text-xl text-slate-500">%</span></p>
            <div className="pb-1">
              <p className="text-xs text-slate-500">Industry avg: 5.1%</p>
              <p className="text-xs" style={{ color: EMERALD }}>Well below average</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: "2.3%" }}
              transition={{ duration: 0.8 }} className="h-2 rounded-full" style={{ background: EMERALD }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "orders",     label: "Orders",     icon: ShoppingCart },
  { id: "products",   label: "Products",   icon: Package },
  { id: "customers",  label: "Customers",  icon: Users },
  { id: "analytics",  label: "Analytics",  icon: BarChart3 },
] as const;

type TabId = typeof TABS[number]["id"];

export default function KVlCommerce() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="h-full flex flex-col" style={{ background: "#080c14" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-0 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)" }}>
            <ShoppingBag size={17} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">KVl Commerce</h1>
            <p className="text-xs text-slate-500">E-commerce Management Dashboard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all relative"
                style={{
                  borderBottomColor: isActive ? GOLD : "transparent",
                  color: isActive ? GOLD : "#64748b",
                }}>
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}>
            {tab === "overview"  && <OverviewTab />}
            {tab === "orders"    && <OrdersTab />}
            {tab === "products"  && <ProductsTab />}
            {tab === "customers" && <CustomersTab />}
            {tab === "analytics" && <AnalyticsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
