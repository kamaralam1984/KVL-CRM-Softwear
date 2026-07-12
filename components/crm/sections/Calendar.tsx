"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Video, Phone, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalEvent = { id: number; day: number; month: number; year: number; title: string; time: string; type: string; color: string };

const initialEvents: CalEvent[] = [
  { id: 1, day: 25, month: 11, year: 2025, title: "Call: RetailPro Demo", time: "10:00 AM", type: "call", color: "blue" },
  { id: 2, day: 25, month: 11, year: 2025, title: "Team Standup", time: "9:00 AM", type: "meeting", color: "violet" },
  { id: 3, day: 26, month: 11, year: 2025, title: "Proposal Review: HealthTech AI", time: "2:00 PM", type: "meeting", color: "cyan" },
  { id: 4, day: 27, month: 11, year: 2025, title: "Call: Nexus Systems Closing", time: "11:00 AM", type: "call", color: "emerald" },
  { id: 5, day: 28, month: 11, year: 2025, title: "Q4 Review Presentation", time: "3:00 PM", type: "meeting", color: "violet" },
  { id: 6, day: 30, month: 11, year: 2025, title: "Contract Signing: RetailPro", time: "1:00 PM", type: "call", color: "emerald" },
];

const typeIcons: Record<string, typeof Video> = { call: Phone, meeting: Video, team: Users };
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/20" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/20" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
};

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type EventForm = { title: string; day: string; time: string; type: string; color: string };
const emptyForm: EventForm = { title: "", day: "", time: "", type: "meeting", color: "blue" };

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalEvent[]>(initialEvents);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const set = (k: keyof EventForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();
  const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayDay = isCurrentMonth ? now.getDate() : -1;

  const currentEvents = events.filter((e) => e.month === month && e.year === year);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const addEvent = () => {
    if (!form.title.trim() || !form.day) return;
    setEvents((prev) => [...prev, {
      id: Date.now(),
      day: parseInt(form.day),
      month,
      year,
      title: form.title,
      time: form.time || "12:00 PM",
      type: form.type,
      color: form.color,
    }]);
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 glass-card rounded-2xl border border-crm-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">{monthNames[month]} {year}</h3>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                  <ChevronLeft size={14} className="text-slate-400" />
                </button>
                <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="ml-2 px-3 py-1 rounded-lg gradient-bg text-white text-xs"
                >
                  <Plus size={11} className="inline mr-1" />Event
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {daysOfWeek.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-slate-600 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {daysArr.map((d) => {
                const hasEvent = currentEvents.some((e) => e.day === d);
                const isToday = d === todayDay;
                return (
                  <div
                    key={d}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all text-xs relative",
                      isToday ? "gradient-bg text-white neon-blue" : "hover:bg-white/[0.06] text-slate-400"
                    )}
                  >
                    {d}
                    {hasEvent && !isToday && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-crm-border p-4 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              {currentEvents.length > 0 ? `Events — ${monthNames[month]}` : `No events in ${monthNames[month]}`}
            </h3>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {currentEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-xs text-slate-600 mb-3">No events this month</p>
                  <button onClick={() => setShowModal(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Plus size={11} /> Add Event
                  </button>
                </div>
              )}
              {currentEvents.map((event, i) => {
                const Icon = typeIcons[event.type] || Phone;
                const c = colorClasses[event.color] || colorClasses.blue;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn("flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:bg-white/[0.04] transition-all", c.border, c.bg)}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", c.bg)}>
                      <Icon size={12} className={c.text} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{event.title}</p>
                      <p className="text-[10px] text-slate-500">{monthNames[month].substring(0, 3)} {event.day} · {event.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Add Event — ${monthNames[month]} ${year}`}>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Event Title *</label>
            <input className={inputCls} placeholder="Meeting with client..." value={form.title} onChange={set("title")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Day (1–{daysInMonth}) *</label>
              <input className={inputCls} type="number" min="1" max={daysInMonth} placeholder="25" value={form.day} onChange={set("day")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Time</label>
              <input className={inputCls} placeholder="10:00 AM" value={form.time} onChange={set("time")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Type</label>
              <select className={selectCls} value={form.type} onChange={set("type")}>
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Color</label>
              <select className={selectCls} value={form.color} onChange={set("color")}>
                <option value="blue">Blue</option>
                <option value="violet">Violet</option>
                <option value="cyan">Cyan</option>
                <option value="emerald">Emerald</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Cancel</button>
            <button onClick={addEvent} disabled={!form.title.trim() || !form.day} className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40">Add Event</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
