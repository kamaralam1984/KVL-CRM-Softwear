// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// Lightweight first-party tracking SDK.
//
//   kvlAnalytics.init()
//   kvlAnalytics.page()
//   kvlAnalytics.track("cta_click", { location: "hero" })
//   kvlAnalytics.identify({ email, phone, name })   // only after voluntary submission
//
// Design goals: never block rendering, batch + retry, survive reload,
// respect consent, avoid duplicate page() calls, degrade silently on any
// network/storage failure.

import { generateVisitorId, generateSessionId } from "../ids";
import type { CollectEventInput } from "../types";

const VISITOR_KEY = "kvl_visitor_id";
const CONSENT_KEY = "kvl_consent";
const SESSION_KEY = "kvl_session";
const QUEUE_KEY = "kvl_event_queue";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const FLUSH_INTERVAL_MS = 4000;
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

interface SessionState {
  sessionId: string;
  startedAt: number;
  lastActivity: number;
  pageViews: number;
}

interface QueuedEvent extends CollectEventInput {
  retries?: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full — tracking degrades silently */
  }
}

class KvlAnalytics {
  private initialized = false;
  private trackingDisabled = false;
  private visitorId = "";
  private session: SessionState | null = null;
  private queue: QueuedEvent[] = [];
  private lastPageUrl = "";

  private consentGranted(): boolean {
    if (!isBrowser()) return false;
    // Anonymous, PII-free analytics runs by default; explicit "denied" opts out.
    return localStorage.getItem(CONSENT_KEY) !== "denied";
  }

  init(): void {
    if (!isBrowser() || this.initialized) return;
    this.initialized = true;

    this.visitorId = localStorage.getItem(VISITOR_KEY) || generateVisitorId();
    localStorage.setItem(VISITOR_KEY, this.visitorId);
    this.queue = readJSON<QueuedEvent[]>(sessionStorage, QUEUE_KEY) ?? [];

    void this.loadTrackingConfig();
    this.ensureSession();
    setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    window.addEventListener("pagehide", () => this.onPageHide());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.onPageHide();
    });
  }

  /**
   * Checks the admin's tracking-enabled kill switch once on init. Fire-and-forget,
   * fails open on any network error (a config-fetch failure must never disable
   * tracking) — matches lib/security/rateLimit.ts's own "fail open" convention.
   * A handful of events may fire in the brief window before this resolves; that's
   * an accepted trade-off for a toggle that defaults to (and should almost always
   * stay) enabled, rather than blocking init() on a network round-trip.
   */
  private async loadTrackingConfig(): Promise<void> {
    try {
      const res = await fetch("/api/analytics/config");
      if (!res.ok) return;
      const data = await res.json();
      this.trackingDisabled = data.trackingEnabled === false;
    } catch {
      /* fail open — tracking stays enabled */
    }
  }

  page(): void {
    if (!isBrowser() || !this.initialized || this.trackingDisabled) return;
    this.ensureSession();
    const url = window.location.href;
    if (url === this.lastPageUrl) return; // de-dupe repeat calls for the same URL (SPA re-renders)
    this.lastPageUrl = url;
    if (this.session) this.session.pageViews += 1;
    this.touchSession();
    this.enqueue({ name: "page_view", page_url: url });
  }

  track(name: string, properties?: Record<string, unknown>): void {
    if (!isBrowser() || !this.initialized || this.trackingDisabled) return;
    this.ensureSession();
    this.touchSession();
    this.enqueue({ name, page_url: window.location.href, properties });
  }

  identify(traits: { name?: string; email?: string; phone?: string }): void {
    if (!isBrowser() || !this.initialized || this.trackingDisabled || !this.consentGranted()) return;
    fetch("/api/analytics/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_id: this.visitorId,
        session_id: this.session?.sessionId,
        page_url: window.location.href,
        traits,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  /** Public read-only accessor — needed by growth-channel components (push opt-in,
   * Truecaller redirect state) that must reference the visitor_id outside identify()/track(). */
  getVisitorId(): string {
    return this.visitorId;
  }

  setConsent(status: "granted" | "denied", categories: Record<string, unknown> = {}): void {
    if (!isBrowser()) return;
    localStorage.setItem(CONSENT_KEY, status);
    fetch("/api/analytics/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: this.visitorId, status, categories }),
      keepalive: true,
    }).catch(() => {});
  }

  private ensureSession(): void {
    const stored = readJSON<SessionState>(sessionStorage, SESSION_KEY);
    const now = Date.now();
    if (stored && now - stored.lastActivity < SESSION_TIMEOUT_MS) {
      this.session = stored;
      return;
    }
    this.session = { sessionId: generateSessionId(), startedAt: now, lastActivity: now, pageViews: 0 };
    writeJSON(sessionStorage, SESSION_KEY, this.session);
    void this.startSession();
  }

  private touchSession(): void {
    if (!this.session) return;
    this.session.lastActivity = Date.now();
    writeJSON(sessionStorage, SESSION_KEY, this.session);
  }

  private deviceContext() {
    const ua = navigator.userAgent;
    const device = /Mobi|Android/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop";
    const browser = /Edg\//.test(ua)
      ? "edge"
      : /Chrome\//.test(ua)
        ? "chrome"
        : /Firefox\//.test(ua)
          ? "firefox"
          : /Safari\//.test(ua)
            ? "safari"
            : "other";
    const os = /Windows/.test(ua)
      ? "windows"
      : /Mac OS/.test(ua)
        ? "macos"
        : /Android/.test(ua)
          ? "android"
          : /iPhone|iPad|iOS/.test(ua)
            ? "ios"
            : /Linux/.test(ua)
              ? "linux"
              : "other";
    return {
      device,
      browser,
      os,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private async startSession(): Promise<void> {
    if (!this.session || !this.consentGranted()) return;
    try {
      await fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_id: this.visitorId,
          session_id: this.session.sessionId,
          phase: "start",
          page_url: window.location.href,
          landing_page: window.location.href,
          referrer: document.referrer,
          device: this.deviceContext(),
        }),
        keepalive: true,
      });
    } catch {
      /* session capture is best-effort — never blocks the page */
    }
  }

  private enqueue(event: CollectEventInput): void {
    if (!this.consentGranted()) return;
    this.queue.push({ ...event, ts: Date.now() });
    writeJSON(sessionStorage, QUEUE_KEY, this.queue);
    if (this.queue.length >= BATCH_SIZE) void this.flush();
  }

  private async flush(useBeacon = false): Promise<void> {
    if (!isBrowser() || !this.queue.length) return;
    const batch = this.queue.splice(0, BATCH_SIZE);
    writeJSON(sessionStorage, QUEUE_KEY, this.queue);

    const payload = JSON.stringify({
      visitor_id: this.visitorId,
      session_id: this.session?.sessionId,
      events: batch.map((e) => ({ name: e.name, page_url: e.page_url, properties: e.properties, ts: e.ts })),
    });

    if (useBeacon && navigator.sendBeacon) {
      const ok = navigator.sendBeacon("/api/analytics/collect", new Blob([payload], { type: "application/json" }));
      if (!ok) this.requeue(batch);
      return;
    }

    try {
      const res = await fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
      if (!res.ok) this.requeue(batch);
    } catch {
      this.requeue(batch);
    }
  }

  private requeue(batch: QueuedEvent[]): void {
    const retried = batch
      .map((e) => ({ ...e, retries: (e.retries ?? 0) + 1 }))
      .filter((e) => (e.retries ?? 0) <= MAX_RETRIES);
    this.queue = [...retried, ...this.queue];
    writeJSON(sessionStorage, QUEUE_KEY, this.queue);
  }

  private onPageHide(): void {
    void this.flush(true);
    if (!this.session) return;
    const duration = Math.round((Date.now() - this.session.startedAt) / 1000);
    try {
      const payload = JSON.stringify({
        visitor_id: this.visitorId,
        session_id: this.session.sessionId,
        phase: "end",
        exit_page: window.location.href,
        duration_seconds: duration,
        pages_viewed: this.session.pageViews,
      });
      navigator.sendBeacon?.("/api/analytics/session", new Blob([payload], { type: "application/json" }));
    } catch {
      /* best-effort */
    }
  }
}

export const kvlAnalytics = new KvlAnalytics();
