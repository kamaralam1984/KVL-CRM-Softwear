import { describe, it, expect } from "vitest";
import { isValidId, str, plainObject } from "./shared";

describe("isValidId", () => {
  it("accepts well-formed visitor/session IDs", () => {
    expect(isValidId("KV-V-ABCDEF123456")).toBe(true);
    expect(isValidId("KV-S-000000")).toBe(true);
  });

  it("rejects malformed or non-string values", () => {
    expect(isValidId("not-an-id")).toBe(false);
    expect(isValidId("kv-v-abcdef123456")).toBe(false); // lowercase hex not allowed
    expect(isValidId("KV-V-")).toBe(false); // too short
    expect(isValidId(123)).toBe(false);
    expect(isValidId(null)).toBe(false);
    expect(isValidId(undefined)).toBe(false);
    expect(isValidId("a".repeat(100))).toBe(false); // exceeds 64 chars
  });
});

describe("str", () => {
  it("returns the string unchanged when under the length cap", () => {
    expect(str("hello", 10)).toBe("hello");
  });

  it("truncates to maxLen", () => {
    expect(str("hello world", 5)).toBe("hello");
  });

  it("returns an empty string for non-string input", () => {
    expect(str(123, 10)).toBe("");
    expect(str(null, 10)).toBe("");
    expect(str(undefined, 10)).toBe("");
    expect(str({}, 10)).toBe("");
  });
});

describe("plainObject", () => {
  it("passes through a plain object", () => {
    expect(plainObject({ a: 1, b: "two" })).toEqual({ a: 1, b: "two" });
  });

  it("returns {} for arrays, null, and primitives", () => {
    expect(plainObject([1, 2, 3])).toEqual({});
    expect(plainObject(null)).toEqual({});
    expect(plainObject(undefined)).toEqual({});
    expect(plainObject("string")).toEqual({});
    expect(plainObject(42)).toEqual({});
  });
});
