import { describe, it, expect } from "vitest";
import { birthdayMessage, festivalGreeting, winBackMessage } from "./seasonal";

describe("Seasonal outreach templates (Phase 33)", () => {
  it("birthdayMessage uses the customer's first name", () => {
    expect(birthdayMessage("Priya Sharma")).toContain("Priya");
    expect(birthdayMessage("Priya Sharma")).toContain("Happy Birthday");
  });

  it("festivalGreeting includes the festival name", () => {
    expect(festivalGreeting("Rohit Verma", "Diwali")).toContain("Diwali");
    expect(festivalGreeting("Rohit Verma", "Diwali")).toContain("Rohit");
  });

  it("winBackMessage is warm, not pushy", () => {
    expect(winBackMessage("Aisha")).toContain("missed you");
  });
});
