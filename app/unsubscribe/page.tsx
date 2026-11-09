import type { Metadata } from "next";
import { verifyUnsubscribe } from "@/lib/compliance/token";
import { addSuppression } from "@/lib/compliance/dnc";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

// Confirm-by-button (not unsub-on-GET) so email security scanners that pre-fetch links can't unsubscribe people.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; done?: string }> }) {
  const { e = "", t = "", done } = await searchParams;
  const valid = verifyUnsubscribe(e, t);

  async function confirm() {
    "use server";
    if (verifyUnsubscribe(e, t)) await addSuppression({ email: e }, { channel: "all", reason: "Unsubscribed via link", source: "unsubscribe_link" });
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[#05080f] text-white px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <h1 className="text-xl font-bold mb-2">Unsubscribe</h1>
        {!valid ? (
          <p className="text-sm text-slate-400">This unsubscribe link is invalid or has expired.</p>
        ) : done ? (
          <p className="text-sm text-emerald-400">Done — {e} will no longer receive messages from us.</p>
        ) : (
          <form action={async () => { "use server"; await confirm(); const { redirect } = await import("next/navigation"); redirect(`/unsubscribe?e=${encodeURIComponent(e)}&t=${t}&done=1`); }}>
            <p className="text-sm text-slate-400 mb-5">Stop all emails and messages to <b className="text-white">{e}</b>?</p>
            <button className="px-5 py-2.5 rounded-xl bg-[#c9a84c] text-black text-sm font-semibold hover:opacity-90">Yes, unsubscribe me</button>
          </form>
        )}
      </div>
    </main>
  );
}
