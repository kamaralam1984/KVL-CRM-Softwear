import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead } from "@/lib/actions/leads";

// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 8 (Security Hardening + Tests)
// Spec's explicit "critical test case": Anonymous → Identified Lead. This mocks
// Supabase + the action/automation modules so the dedup/idempotency/creation
// logic in resolveIdentity() is genuinely exercised without a live database.

interface FakeLeadRow {
  id: number;
  email: string;
  phone: string;
}
interface FakeLinkRow {
  visitor_id: string;
  lead_id: number;
  matched_on: string;
}

const { createLeadMock, triggerLeadCreatedMock } = vi.hoisted(() => ({
  createLeadMock: vi.fn(),
  triggerLeadCreatedMock: vi.fn(),
}));

let leads: FakeLeadRow[];
let links: FakeLinkRow[];
let nextLeadId: number;

vi.mock("@/lib/supabase/server", () => ({
  getServerClient: () => ({
    from(table: string) {
      if (table === "visitor_identity_links") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                const found = links.find((l) => l.visitor_id === val);
                return { data: found ? { lead_id: found.lead_id, matched_on: found.matched_on } : null };
              },
            }),
          }),
          insert: async (row: FakeLinkRow) => {
            links.push(row);
            return { data: null, error: null };
          },
        };
      }
      if (table === "leads") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                const found = leads.find((l) => l.phone === val);
                return { data: found ? { id: found.id } : null };
              },
            }),
            ilike: (_col: string, val: string) => ({
              maybeSingle: async () => {
                const found = leads.find((l) => l.email.toLowerCase() === val.toLowerCase());
                return { data: found ? { id: found.id } : null };
              },
            }),
          }),
        };
      }
      throw new Error(`resolve.test.ts mock: unexpected table "${table}"`);
    },
  }),
}));

vi.mock("@/lib/tracking/store", () => ({
  getVisitorAttribution: async () => ({ source: "google", campaign: "diwali_sale" }),
}));

vi.mock("@/lib/actions/leads", () => ({ createLead: createLeadMock }));
vi.mock("@/lib/automation/engine", () => ({ triggerLeadCreated: triggerLeadCreatedMock }));

// Imported after the mocks — vi.mock calls are hoisted by Vitest regardless,
// but this keeps the file readable top-to-bottom.
import { resolveIdentity, normalizePhone, initials, sourceTag } from "./resolve";

beforeEach(() => {
  leads = [];
  links = [];
  nextLeadId = 1;
  createLeadMock.mockReset();
  triggerLeadCreatedMock.mockReset();
  createLeadMock.mockImplementation(async (lead: Omit<Lead, "id">): Promise<Lead> => {
    const created: Lead = { id: nextLeadId++, ...lead };
    leads.push({ id: created.id, email: lead.email, phone: lead.phone });
    return created;
  });
});

describe("normalizePhone", () => {
  it("strips spaces/dashes/parens but keeps a leading +", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("(555) 123-4567")).toBe("5551234567");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(initials("Rahul Verma")).toBe("RV");
    expect(initials("madonna")).toBe("M");
  });

  it("falls back to '?' for empty input", () => {
    expect(initials("")).toBe("?");
  });
});

describe("sourceTag", () => {
  it("tags Meta sources", () => {
    expect(sourceTag("facebook")).toBe("Meta Lead");
    expect(sourceTag("instagram.com")).toBe("Meta Lead");
  });

  it("tags Google sources", () => {
    expect(sourceTag("google")).toBe("Google Lead");
  });

  it("returns null for unrecognized sources", () => {
    expect(sourceTag("direct")).toBeNull();
    expect(sourceTag("news.example.com")).toBeNull();
  });
});

describe("resolveIdentity — anonymous → identified lead (critical path, spec §7/§24)", () => {
  it("creates a new lead for a new visitor with a new email, and fires the Lead Nurture automation", async () => {
    const result = await resolveIdentity({ visitorId: "KV-V-AAAAAAAAAAAA", name: "Rahul Verma", email: "rahul@example.com", phone: "" });

    expect(result).toEqual({ leadId: 1, matchedOn: "new" });
    expect(createLeadMock).toHaveBeenCalledTimes(1);
    expect(triggerLeadCreatedMock).toHaveBeenCalledTimes(1);
    expect(links).toEqual([{ visitor_id: "KV-V-AAAAAAAAAAAA", lead_id: 1, matched_on: "new" }]);
  });

  it("is idempotent — identifying the same visitor again returns the same lead without creating a duplicate", async () => {
    await resolveIdentity({ visitorId: "KV-V-BBBBBBBBBBBB", name: "Amit", email: "amit@example.com", phone: "" });
    createLeadMock.mockClear();

    const second = await resolveIdentity({ visitorId: "KV-V-BBBBBBBBBBBB", name: "Amit", email: "amit@example.com", phone: "" });

    expect(second).toEqual({ leadId: 1, matchedOn: "new" });
    expect(createLeadMock).not.toHaveBeenCalled();
    expect(links).toHaveLength(1);
  });

  it("matches a different visitor with the same email to the existing lead instead of duplicating (spec §24)", async () => {
    await resolveIdentity({ visitorId: "KV-V-CCCCCCCCCCCC", name: "Priya", email: "priya@example.com", phone: "" });
    createLeadMock.mockClear();

    const result = await resolveIdentity({ visitorId: "KV-V-DDDDDDDDDDDD", name: "Priya S", email: "priya@example.com", phone: "" });

    expect(result).toEqual({ leadId: 1, matchedOn: "email" });
    expect(createLeadMock).not.toHaveBeenCalled();
    expect(links).toHaveLength(2); // two distinct visitor_ids, one shared lead
  });

  it("matches by phone before email when both would match different leads", async () => {
    await resolveIdentity({ visitorId: "KV-V-EEEEEEEEEEEE", name: "Phone Lead", email: "phone-lead@example.com", phone: "+919876543210" });
    createLeadMock.mockClear();

    const result = await resolveIdentity({ visitorId: "KV-V-FFFFFFFFFFFF", name: "Someone Else", email: "different@example.com", phone: "+91 98765 43210" });

    expect(result?.matchedOn).toBe("phone");
    expect(result?.leadId).toBe(1);
  });

  it("returns null and writes nothing when only a name is given (no email/phone)", async () => {
    const result = await resolveIdentity({ visitorId: "KV-V-GGGGGGGGGGGG", name: "No Contact", email: "", phone: "" });

    expect(result).toBeNull();
    expect(createLeadMock).not.toHaveBeenCalled();
    expect(links).toHaveLength(0);
  });
});
