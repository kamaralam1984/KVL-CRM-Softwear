import { describe, it, expect, vi } from "vitest";
import { runAfterResponse } from "./background";

describe("runAfterResponse", () => {
  it("runs the task inline when there is no request scope (tests/scripts)", async () => {
    const task = vi.fn(async () => {});
    await runAfterResponse(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
  it("never throws if the task fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(runAfterResponse(async () => { throw new Error("boom"); })).resolves.toBeUndefined();
  });
});
