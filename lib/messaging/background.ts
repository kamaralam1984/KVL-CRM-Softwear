// Run work after the HTTP response has been sent (Next's after()), so webhook providers get a fast 200 and
// don't retry while a slow step (AI auto-reply, DB writes) is still running. Falls back to awaiting inline
// when there is no request scope (unit tests, scripts).
import { after } from "next/server";

export async function runAfterResponse(task: () => Promise<void>): Promise<void> {
  const safe = async () => { try { await task(); } catch (err) { console.error("[messaging] background task failed:", err); } };
  try { after(safe); } catch { await safe(); }
}
