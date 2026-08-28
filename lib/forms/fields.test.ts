import { describe, it, expect } from "vitest";
import { FIELD_TYPES, defaultField, newFieldId, computeScore, matchScoreBand, type FormField } from "./fields";

describe("Forms/Quiz field model (Phase 43)", () => {
  it("every field type has a working default", () => {
    for (const type of FIELD_TYPES) {
      const field = defaultField(type);
      expect(field.type).toBe(type);
      expect(field.id).toBeTruthy();
    }
  });

  it("newFieldId returns unique ids", () => {
    const ids = new Set(Array.from({ length: 20 }, () => newFieldId()));
    expect(ids.size).toBe(20);
  });

  it("select/radio/checkbox fields get default options; text/email/phone/textarea/rating don't", () => {
    expect(defaultField("select").options?.length).toBeGreaterThan(0);
    expect(defaultField("radio").options?.length).toBeGreaterThan(0);
    expect(defaultField("checkbox").options?.length).toBeGreaterThan(0);
    expect(defaultField("text").options).toBeUndefined();
    expect(defaultField("email").options).toBeUndefined();
    expect(defaultField("rating").options).toBeUndefined();
  });

  describe("computeScore", () => {
    const fields: FormField[] = [
      { id: "q1", type: "radio", label: "Budget?", required: true, options: [
        { label: "Low", value: "low", scoreWeight: 1 },
        { label: "High", value: "high", scoreWeight: 10 },
      ] },
      { id: "q2", type: "checkbox", label: "Needs?", required: false, options: [
        { label: "A", value: "a", scoreWeight: 2 },
        { label: "B", value: "b", scoreWeight: 3 },
      ] },
      { id: "q3", type: "text", label: "Name", required: true }, // no options — never contributes
    ];

    it("sums a single radio selection's weight", () => {
      expect(computeScore(fields, { q1: "high" })).toBe(10);
    });

    it("sums multiple checkbox selections' weights", () => {
      expect(computeScore(fields, { q2: ["a", "b"] })).toBe(5);
    });

    it("combines radio + checkbox scores, ignoring text fields", () => {
      expect(computeScore(fields, { q1: "low", q2: ["a", "b"], q3: "Ignored value" })).toBe(6);
    });

    it("returns 0 when nothing is answered", () => {
      expect(computeScore(fields, {})).toBe(0);
    });

    it("ignores an answer value that doesn't match any option", () => {
      expect(computeScore(fields, { q1: "not-a-real-option" })).toBe(0);
    });
  });

  describe("matchScoreBand", () => {
    const bands = [
      { minScore: 0, maxScore: 5, outcomeTitle: "Starter", outcomeText: "..." },
      { minScore: 6, maxScore: 15, outcomeTitle: "Growth", outcomeText: "..." },
    ];

    it("matches the band whose range contains the score", () => {
      expect(matchScoreBand(bands, 3)?.outcomeTitle).toBe("Starter");
      expect(matchScoreBand(bands, 10)?.outcomeTitle).toBe("Growth");
    });

    it("returns null when no band matches", () => {
      expect(matchScoreBand(bands, 100)).toBeNull();
    });
  });
});
