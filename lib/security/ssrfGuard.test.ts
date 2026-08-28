import { describe, it, expect } from "vitest";
import { isSafeWebhookUrl } from "./ssrfGuard";

describe("isSafeWebhookUrl (Phase 40 gap-check fix)", () => {
  it("rejects localhost", async () => {
    expect(await isSafeWebhookUrl("http://localhost:3000/hook")).toBe(false);
  });

  it("rejects a literal loopback IP", async () => {
    expect(await isSafeWebhookUrl("http://127.0.0.1/hook")).toBe(false);
  });

  it("rejects a literal private-range IP (10.x)", async () => {
    expect(await isSafeWebhookUrl("http://10.0.0.5/hook")).toBe(false);
  });

  it("rejects the link-local/cloud-metadata range", async () => {
    expect(await isSafeWebhookUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
  });

  it("rejects a private-range IP (192.168.x)", async () => {
    expect(await isSafeWebhookUrl("http://192.168.1.1/hook")).toBe(false);
  });

  it("rejects a non-http(s) protocol", async () => {
    expect(await isSafeWebhookUrl("ftp://example.com/hook")).toBe(false);
  });

  it("rejects a malformed URL", async () => {
    expect(await isSafeWebhookUrl("not a url")).toBe(false);
  });

  it("rejects a hostname that can't be resolved (fails closed)", async () => {
    expect(await isSafeWebhookUrl("https://this-host-does-not-exist-kvl-test.invalid/hook")).toBe(false);
  });
});
