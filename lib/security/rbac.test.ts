import { describe, it, expect } from "vitest";
import { can, allowedActions, RESOURCES } from "./rbac";

describe("rbac — Phase 18 resources", () => {
  it("includes every GHL-parity resource introduced by the roadmap", () => {
    for (const r of ["marketing", "social", "commerce", "funnels", "membership", "affiliates", "whitelabel", "helpdesk"]) {
      expect(RESOURCES).toContain(r);
    }
  });

  it("Super Admin can do anything on the new resources", () => {
    expect(can("Super Admin", "commerce", "delete")).toBe(true);
    expect(can("Super Admin", "membership", "admin")).toBe(true);
  });

  it("Admin gets the new resources via its wildcard grant", () => {
    expect(can("Admin", "social", "create")).toBe(true);
    expect(can("Admin", "funnels", "update")).toBe(true);
  });

  it("Marketing can manage social/marketing but not commerce", () => {
    expect(can("Marketing", "social", "create")).toBe(true);
    expect(can("Marketing", "marketing", "delete")).toBe(true);
    expect(can("Marketing", "commerce", "read")).toBe(false);
  });

  it("Finance can read/update commerce but not delete", () => {
    expect(allowedActions("Finance", "commerce")).toEqual(["read", "create", "update"]);
    expect(can("Finance", "commerce", "delete")).toBe(false);
  });

  it("Viewer is read-only on every new resource", () => {
    for (const r of ["marketing", "social", "commerce", "funnels", "membership", "affiliates", "whitelabel", "helpdesk"]) {
      expect(can("Viewer", r, "read")).toBe(true);
      expect(can("Viewer", r, "create")).toBe(false);
    }
  });

  it("a role with no grant for a resource and no wildcard defaults to deny", () => {
    expect(can("Sales Rep", "commerce", "read")).toBe(false);
  });
});
