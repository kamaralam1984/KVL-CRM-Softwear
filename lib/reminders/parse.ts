// Reminder Engine — pure date helpers (no I/O): due-text parsing, callback-time detection,
// and the standard reminder schedules for meetings and invoices.

const MIN = 60_000;
const mk = (tz: number, y: number, m: number, d: number, h = 10, mi = 0) => new Date(Date.UTC(y, m, d, h, mi) - tz * MIN);
const localParts = (now: Date, tz: number) => { const l = new Date(now.getTime() + tz * MIN); return { y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate(), h: l.getUTCHours() }; };

/** "10:30 AM" / "2 pm" / "14:00" → {h, mi}. */
export function parseClock(text: string): { h: number; mi: number } | null {
  const m = text.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]); const mi = Number(m[2] ?? 0);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return h > 23 || mi > 59 ? null : { h, mi };
}

/** Free-text "due" → Date. Handles Today / Tomorrow / YYYY-MM-DD[ HH:mm] / DD/MM/YYYY / "Nov 20, 2026". */
export function parseDue(text: string | null | undefined, now: Date, tz = 330, defaultHour = 10): Date | null {
  const t = (text ?? "").trim().toLowerCase();
  if (!t || t === "no due date") return null;
  const n = localParts(now, tz);
  if (t === "today") return mk(tz, n.y, n.m, n.d, 18);
  if (t === "tomorrow") return mk(tz, n.y, n.m, n.d + 1, defaultHour);
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2}):(\d{2}))?/);
  if (m) return mk(tz, +m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : defaultHour, m[5] ? +m[5] : 0);
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return mk(tz, +m[3], +m[2] - 1, +m[1], defaultHour);
  const ms = Date.parse(text as string);
  if (Number.isFinite(ms)) { const d = new Date(ms); return mk(tz, d.getFullYear(), d.getMonth(), d.getDate(), defaultHour); }
  return null;
}

/** "call me tomorrow 5 pm" / "kal 5 baje call karna" → the requested callback time, else null. */
export function detectCallbackTime(text: string, now: Date, tz = 330): Date | null {
  const t = text.toLowerCase();
  if (!/(call|phone|ring|baat|bulao|contact|reach|talk)/.test(t)) return null;
  const clock = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)\b/) ?? t.match(/\b(\d{1,2}):(\d{2})()\b/);
  if (!clock) return null;
  let h = Number(clock[1]); const mi = Number(clock[2] ?? 0); const suffix = clock[3];
  if (suffix === "pm" && h < 12) h += 12;
  else if (suffix === "am" && h === 12) h = 0;
  else if (suffix === "baje") h = h >= 1 && h <= 7 ? h + 12 : h; // "5 baje" ≈ 5 PM; 8–11 ≈ morning
  if (h > 23 || mi > 59) return null;
  const n = localParts(now, tz);
  const dayOffset = /\b(tomorrow|kal)\b/.test(t) ? 1 : /\b(today|aaj)\b/.test(t) ? 0 : -1;
  let at = mk(tz, n.y, n.m, n.d + Math.max(dayOffset, 0), h, mi);
  if (dayOffset === -1 && at.getTime() <= now.getTime()) at = mk(tz, n.y, n.m, n.d + 1, h, mi); // bare time already passed → tomorrow
  return at.getTime() > now.getTime() ? at : null;
}

export interface Planned { label: string; at: Date }

/** Client reminders: 24h, 2h and 15 min before a meeting. Past ones are dropped. */
export function meetingReminderTimes(startsAt: Date, now: Date): Planned[] {
  return ([["24h", 24 * 60], ["2h", 120], ["15m", 15]] as const)
    .map(([label, mins]) => ({ label, at: new Date(startsAt.getTime() - mins * MIN) }))
    .filter((p) => p.at.getTime() > now.getTime() - 5 * MIN);
}

/** Invoice reminders: 3 days before, on the due date, then 3 / 7 / 15 days overdue. */
export function invoiceReminderPlan(due: Date): Planned[] {
  const D = 24 * 60 * MIN;
  return [["pre3", -3], ["due", 0], ["over3", 3], ["over7", 7], ["over15", 15]].map(([label, days]) => ({ label: label as string, at: new Date(due.getTime() + (days as number) * D) }));
}
