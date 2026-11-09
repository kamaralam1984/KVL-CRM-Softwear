import { describe, it, expect } from "vitest";
import { parseDue, parseClock, detectCallbackTime, meetingReminderTimes, invoiceReminderPlan } from "./parse";

// "now" = Mon 2026-01-12 12:00 IST (06:30 UTC)
const now = new Date(Date.UTC(2026, 0, 12, 6, 30));
const ist = (y: number, m: number, d: number, h: number, mi = 0) => new Date(Date.UTC(y, m - 1, d, h, mi) - 330 * 60_000);

describe("parseClock", () => {
  it.each([["10:30 AM", 10, 30], ["2 pm", 14, 0], ["12 am", 0, 0], ["12 pm", 12, 0], ["14:00", 14, 0]])("%s", (t, h, mi) => expect(parseClock(t)).toEqual({ h, mi }));
  it("rejects garbage", () => { expect(parseClock("noon")).toBeNull(); expect(parseClock("25:00")).toBeNull(); });
});

describe("parseDue", () => {
  it("Today → 18:00 IST today", () => expect(parseDue("Today", now, 330, 18)).toEqual(ist(2026, 1, 12, 18)));
  it("Tomorrow → default hour tomorrow", () => expect(parseDue("Tomorrow", now, 330, 10)).toEqual(ist(2026, 1, 13, 10)));
  it("ISO date and datetime", () => { expect(parseDue("2026-02-03", now)).toEqual(ist(2026, 2, 3, 10)); expect(parseDue("2026-02-03T15:45", now)).toEqual(ist(2026, 2, 3, 15, 45)); });
  it("DD/MM/YYYY", () => expect(parseDue("25/12/2026", now)).toEqual(ist(2026, 12, 25, 10)));
  it("ignores empty / 'No due date' / junk", () => { expect(parseDue("", now)).toBeNull(); expect(parseDue("No due date", now)).toBeNull(); expect(parseDue("whenever", now)).toBeNull(); });
});

describe("detectCallbackTime", () => {
  it("tomorrow 5 pm", () => expect(detectCallbackTime("please call me tomorrow 5 pm", now)).toEqual(ist(2026, 1, 13, 17)));
  it("Hinglish: kal 5 baje call karna", () => expect(detectCallbackTime("kal 5 baje call karna", now)).toEqual(ist(2026, 1, 13, 17)));
  it("today later this evening", () => expect(detectCallbackTime("call me today at 6:30 pm", now)).toEqual(ist(2026, 1, 12, 18, 30)));
  it("bare time already passed → tomorrow", () => expect(detectCallbackTime("call at 9 am", now)).toEqual(ist(2026, 1, 13, 9)));
  it("needs a call word and a time", () => { expect(detectCallbackTime("tomorrow 5 pm works", now)).toBeNull(); expect(detectCallbackTime("call me tomorrow", now)).toBeNull(); });
});

describe("schedules", () => {
  it("meeting: 24h, 2h, 15m; drops past ones", () => {
    const start = new Date(now.getTime() + 3 * 3_600_000);
    expect(meetingReminderTimes(start, now).map((p) => p.label)).toEqual(["2h", "15m"]);
    expect(meetingReminderTimes(new Date(now.getTime() + 48 * 3_600_000), now).map((p) => p.label)).toEqual(["24h", "2h", "15m"]);
  });
  it("invoice: 3d before, due, +3/+7/+15", () => {
    const plan = invoiceReminderPlan(ist(2026, 1, 20, 10));
    expect(plan.map((p) => p.label)).toEqual(["pre3", "due", "over3", "over7", "over15"]);
    expect(plan[0].at).toEqual(ist(2026, 1, 17, 10));
    expect(plan[4].at).toEqual(ist(2026, 2, 4, 10));
  });
});
