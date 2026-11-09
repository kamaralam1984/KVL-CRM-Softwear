import { describe, it, expect } from "vitest";
import {
  DEFAULT_SEQUENCE, adjustForQuietHours, buildCtx, classifyInbound, fallbackNudge,
  needsAiNudge, renderTemplate, stepDueAt,
} from "./sequence";

// IST = UTC+5:30. 06:30 UTC = 12:00 IST; 17:00 UTC = 22:30 IST; 02:00 UTC = 07:30 IST.
const utc = (h: number, m = 0, d = 10) => new Date(Date.UTC(2026, 0, d, h, m));

describe("default sequence", () => {
  it("spans 90 days, is time-ordered, and uses all three channels", () => {
    const hrs = DEFAULT_SEQUENCE.steps.map((s) => s.atHours);
    expect([...hrs].sort((a, b) => a - b)).toEqual(hrs);
    expect(Math.max(...hrs)).toBe(90 * 24);
    expect(new Set(DEFAULT_SEQUENCE.steps.map((s) => s.channel))).toEqual(new Set(["whatsapp", "email", "call"]));
  });
  it("email steps always have a subject", () => {
    for (const s of DEFAULT_SEQUENCE.steps.filter((x) => x.channel === "email")) expect(s.subject).toBeTruthy();
  });
});

describe("renderTemplate / buildCtx", () => {
  it("fills placeholders and falls back for missing lead fields", () => {
    const ctx = buildCtx({ name: "Rahul Sharma", company: "", owner: "" }, "KVL");
    expect(ctx).toEqual({ firstName: "Rahul", company: "your business", brand: "KVL", owner: "the team" });
    expect(renderTemplate("Hi {{firstName}} from {{brand}} re {{company}}", ctx)).toBe("Hi Rahul from KVL re your business");
  });
});

describe("adjustForQuietHours (IST)", () => {
  it("leaves daytime untouched", () => {
    const d = utc(6, 30);
    expect(adjustForQuietHours(d)).toEqual(d);
  });
  it("defers late night to 10:00 IST next day", () => {
    expect(adjustForQuietHours(utc(17, 0))).toEqual(utc(4, 30, 11)); // 10:00 IST on the 11th
  });
  it("defers early morning to 10:00 IST same day", () => {
    expect(adjustForQuietHours(utc(2, 0))).toEqual(utc(4, 30, 10));
  });
  it("stepDueAt applies quiet hours", () => {
    const due = stepDueAt(utc(17, 0), DEFAULT_SEQUENCE.steps[0]);
    expect(due).toEqual(utc(4, 30, 11));
  });
});

describe("classifyInbound", () => {
  it.each([
    ["STOP", "optout"], ["not interested", "optout"], ["please don't message me", "optout"], ["mat bhejo", "optout"],
    ["send me the payment link", "payment_intent"], ["ready to start", "payment_intent"], ["how do I pay?", "payment_intent"], ["link bhejo", "payment_intent"],
    ["what is the price?", "normal"], ["call me tomorrow", "normal"],
  ])("%s → %s", (text, intent) => expect(classifyInbound(text)).toBe(intent));
  it("opt-out beats payment intent", () => expect(classifyInbound("stop, I will not pay")).toBe("optout"));
});

describe("needsAiNudge (24h human-reply SLA)", () => {
  const now = utc(6, 0, 12);
  const base = { last_inbound_at: null as string | null, last_human_reply_at: null as string | null, last_ai_nudge_at: null as string | null, ai_nudge_count: 0 };
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

  it("no inbound → no nudge", () => expect(needsAiNudge(base, now)).toBe(false));
  it("inbound 23h ago → not yet", () => expect(needsAiNudge({ ...base, last_inbound_at: hoursAgo(23) }, now)).toBe(false));
  it("inbound 25h ago, no human reply → nudge", () => expect(needsAiNudge({ ...base, last_inbound_at: hoursAgo(25) }, now)).toBe(true));
  it("human replied after inbound → no nudge", () =>
    expect(needsAiNudge({ ...base, last_inbound_at: hoursAgo(30), last_human_reply_at: hoursAgo(5) }, now)).toBe(false));
  it("human reply BEFORE a newer inbound does not count", () =>
    expect(needsAiNudge({ ...base, last_inbound_at: hoursAgo(26), last_human_reply_at: hoursAgo(40) }, now)).toBe(true));
  it("second nudge only 24h after the first", () => {
    expect(needsAiNudge({ ...base, last_inbound_at: hoursAgo(40), last_ai_nudge_at: hoursAgo(10), ai_nudge_count: 1 }, now)).toBe(false);
    expect(needsAiNudge({ ...base, last_inbound_at: hoursAgo(60), last_ai_nudge_at: hoursAgo(25), ai_nudge_count: 1 }, now)).toBe(true);
  });
  it("caps nudges per reply", () => expect(needsAiNudge({ ...base, last_inbound_at: hoursAgo(100), last_ai_nudge_at: hoursAgo(50), ai_nudge_count: 2 }, now)).toBe(false));
});

describe("fallbackNudge", () => {
  it("returns a soft message mentioning the client", () => {
    const ctx = buildCtx({ name: "Priya", company: "Acme", owner: "Sarah" }, "KVL");
    expect(fallbackNudge(ctx, 0).body).toContain("Priya");
    expect(fallbackNudge(ctx, 1).body).toContain("Sarah");
  });
});
