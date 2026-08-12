// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)

export const TRACKED_EVENT_NAMES = [
  "page_view",
  "session_start",
  "session_end",
  "scroll_depth",
  "cta_click",
  "pricing_view",
  "demo_click",
  "form_start",
  "form_submit",
  "whatsapp_click",
  "phone_click",
  "email_click",
  "download",
  "video_play",
  "video_complete",
  "outbound_click",
  "identify",
] as const;

export type TrackedEventName = (typeof TRACKED_EVENT_NAMES)[number];

export interface AttributionParams {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  gclid: string;
  fbclid: string;
  msclkid: string;
}

export interface DeviceContext {
  device: string;
  browser: string;
  os: string;
  language: string;
  timezone: string;
}

export interface Visitor {
  id: number;
  visitor_id: string;
  first_seen_at: string;
  last_seen_at: string;
  page_views: number;
  session_count: number;
  device: string;
  browser: string;
  os: string;
  language: string;
  timezone: string;
  country: string;
  region: string;
  referrer: string;
  landing_page: string;
  first_touch_source: string;
  first_touch_medium: string;
  first_touch_campaign: string;
  first_touch_term: string;
  first_touch_content: string;
  first_touch_gclid: string;
  first_touch_fbclid: string;
  first_touch_msclkid: string;
  last_touch_source: string;
  last_touch_medium: string;
  last_touch_campaign: string;
  last_touch_term: string;
  last_touch_content: string;
  last_touch_gclid: string;
  last_touch_fbclid: string;
  last_touch_msclkid: string;
  identified: boolean;
  consent_status: "granted" | "denied" | "unknown";
  intent_score: number;
  intent_band: "cold" | "warm" | "hot" | "very_hot";
  created_at: string;
}

export interface VisitorSession {
  id: number;
  session_id: string;
  visitor_id: string;
  started_at: string;
  ended_at: string | null;
  landing_page: string;
  exit_page: string;
  pages_viewed: number;
  duration_seconds: number;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  gclid: string;
  fbclid: string;
  msclkid: string;
  device: string;
  browser: string;
  os: string;
  created_at: string;
}

export interface VisitorEvent {
  id: number;
  visitor_id: string;
  session_id: string | null;
  event_name: string;
  page_url: string;
  properties: Record<string, unknown>;
  created_at: string;
}

/** Wire payload for a single queued event (SDK → /api/analytics/collect). */
export interface CollectEventInput {
  name: string;
  page_url?: string;
  properties?: Record<string, unknown>;
  ts?: number;
}
