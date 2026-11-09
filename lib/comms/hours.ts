// Business-hours logic (pure). Used for the off-hours auto-reply.
export interface BusinessHours {
  enabled: boolean;
  tzOffsetMin: number;   // e.g. 330 for IST
  start: string;         // "10:00"
  end: string;           // "19:00"
  days: number[];        // 0=Sun … 6=Sat
}
export const DEFAULT_HOURS: BusinessHours = { enabled: false, tzOffsetMin: 330, start: "10:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] };

const mins = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

export function isWithinBusinessHours(at: Date, cfg: BusinessHours): boolean {
  if (!cfg.enabled) return true;
  const local = new Date(at.getTime() + cfg.tzOffsetMin * 60_000);
  const m = local.getUTCHours() * 60 + local.getUTCMinutes();
  return cfg.days.includes(local.getUTCDay()) && m >= mins(cfg.start) && m < mins(cfg.end);
}

/** Human text for when the team is next in, e.g. "Mon 10:00". */
export function nextOpeningLabel(at: Date, cfg: BusinessHours): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 8; i++) {
    const probe = new Date(at.getTime() + cfg.tzOffsetMin * 60_000 + i * 86_400_000);
    const day = probe.getUTCDay();
    const nowMin = probe.getUTCHours() * 60 + probe.getUTCMinutes();
    if (cfg.days.includes(day) && (i > 0 || nowMin < mins(cfg.start))) return `${i === 0 ? "today" : names[day]} ${cfg.start}`;
  }
  return cfg.start;
}
