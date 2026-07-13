// Phase 15 — Enterprise Security: Audit Log
// Client-side append-only audit trail persisted to localStorage. Mirrors the
// pattern used by lib/appConfig.ts (ActivityEntry / crm_activity_log) but is a
// separate, security-focused store keyed "crm_audit_log".

export interface AuditEntry {
  /** Who performed the action (user id, email, or display name). */
  actor: string;
  /** What happened, e.g. "login", "role.change", "record.delete". */
  action: string;
  /** The resource / section acted upon, e.g. "leads", "settings". */
  resource: string;
  /** Optional free-form detail. */
  detail?: string;
  /** Epoch millis — stamped inside logAudit via Date.now(). */
  time: number;
}

const AUDIT_KEY = "crm_audit_log";
const MAX_ENTRIES = 1000;

function readAll(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch (err) {
    console.error("[security] audit readAll failed", err);
    return [];
  }
}

function writeAll(entries: AuditEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("[security] audit writeAll failed", err);
  }
}

/**
 * logAudit — append one entry. The timestamp is stamped here via Date.now(),
 * so callers pass only the semantic fields. Newest entries are stored first.
 * No-op (but safe) on the server where window is undefined.
 */
export function logAudit(entry: {
  actor: string;
  action: string;
  resource: string;
  detail?: string;
}): AuditEntry {
  const stamped: AuditEntry = {
    actor: String(entry?.actor ?? "unknown"),
    action: String(entry?.action ?? "unknown"),
    resource: String(entry?.resource ?? "unknown"),
    detail: entry?.detail != null ? String(entry.detail) : undefined,
    time: Date.now(),
  };
  try {
    const all = readAll();
    all.unshift(stamped);
    if (all.length > MAX_ENTRIES) all.length = MAX_ENTRIES;
    writeAll(all);
  } catch (err) {
    console.error("[security] logAudit failed", err);
  }
  return stamped;
}

/**
 * getAuditLog — return the most recent entries (newest first).
 * @param limit optional cap; omitted returns all stored entries.
 */
export function getAuditLog(limit?: number): AuditEntry[] {
  try {
    const all = readAll();
    if (typeof limit === "number" && limit >= 0) return all.slice(0, limit);
    return all;
  } catch (err) {
    console.error("[security] getAuditLog failed", err);
    return [];
  }
}

/** clearAuditLog — wipe the audit trail. Safe on the server (no-op). */
export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUDIT_KEY);
  } catch (err) {
    console.error("[security] clearAuditLog failed", err);
  }
}
