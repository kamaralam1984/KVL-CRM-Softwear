import { describe, it, expect } from "vitest";
import { normalizeContactPhone, personalize, fillNumbered, templateParamCount } from "./broadcast";

describe("normalizeContactPhone", () => {
  it("adds the default country code to 10-digit numbers", () => expect(normalizeContactPhone("98123 45678", "91")).toBe("+919812345678"));
  it("keeps explicit international numbers", () => expect(normalizeContactPhone("+971 50 123 4567", "91")).toBe("+971501234567"));
  it("handles 00 prefix and leading-0 national numbers", () => {
    expect(normalizeContactPhone("0044 7700 900123", "91")).toBe("+447700900123");
    expect(normalizeContactPhone("09812345678", "91")).toBe("+919812345678");
  });
  it("rejects junk", () => { expect(normalizeContactPhone("abc", "91")).toBeNull(); expect(normalizeContactPhone("12345", "91")).toBeNull(); });
});

describe("message merge", () => {
  const v = { name: "Asha Sharma", firstName: "Asha", company: "Acme", phone: "+919812345678" };
  it("fills merge tags", () => expect(personalize("Hi {{firstName}} from {{ company }}", v)).toBe("Hi Asha from Acme"));
  it("applies spintax stably per recipient, alongside merge tags", () => {
    const out = personalize("{Hi|Hello} {{firstName}}", v);
    expect(out).toMatch(/^(Hi|Hello) Asha$/);
    expect(personalize("{Hi|Hello} {{firstName}}", v)).toBe(out); // logged text === sent text
  });
  it("leaves unknown tags alone", () => expect(personalize("{{foo}}", v)).toBe("{{foo}}"));
  it("fills Meta numbered params", () => expect(fillNumbered("Hello {{1}}, order {{2}}", ["Asha", "A12"])).toBe("Hello Asha, order A12"));
  it("counts template params", () => { expect(templateParamCount("Hi {{1}} {{2}}")).toBe(2); expect(templateParamCount("no vars")).toBe(0); });
});
