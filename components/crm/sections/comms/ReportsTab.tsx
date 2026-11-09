"use client";
import { getCommsReport } from "@/lib/actions/comms";
import { Card, token, useLoad } from "./ui";

const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="rounded-lg bg-white/[0.03] p-2.5"><div className="text-lg font-bold text-white">{value}</div><div className="text-[10px] text-slate-500">{label}</div>{sub && <div className="text-[9px] text-[#c9a84c]">{sub}</div>}</div>
);

export default function ReportsTab() {
  const [r] = useLoad(() => getCommsReport(token()), null as Awaited<ReturnType<typeof getCommsReport>>, 60_000);
  if (!r) return <p className="text-[11px] text-slate-500">Loading report… (last 90 days)</p>;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  return (
    <div className="space-y-3">
      <Card title="Follow-up funnel (90 days)"><div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Enrolled" value={r.funnel.enrolled} /><Stat label="Replied" value={r.funnel.replied} sub={`${r.funnel.replyRate}% reply rate`} />
        <Stat label="Ready to pay" value={r.funnel.paymentReady} /><Stat label="Paid / Won" value={r.funnel.won} sub={`${r.funnel.conversionRate}% conversion`} />
        <Stat label="Active now" value={r.funnel.active} /><Stat label="Stopped / opted out" value={r.funnel.stopped} /><Stat label="Completed 90d" value={r.funnel.completed} /><Stat label="Do-Not-Contact list" value={r.dncCount} /></div></Card>
      <Card title="Which step gets replies?">
        <table className="w-full text-[10px]"><thead><tr className="text-slate-500 text-left"><th className="py-1">Step</th><th>Channel</th><th>Sent</th><th>Replies</th><th>Reply rate</th></tr></thead>
          <tbody>{r.steps.map((x) => <tr key={x.step} className="border-t border-white/[0.04] text-slate-300"><td className="py-1">#{x.step}</td><td className="capitalize">{x.channel}</td><td>{x.sent}</td><td>{x.replies}</td><td>{x.replyRate}%</td></tr>)}
            {r.steps.length === 0 && <tr><td colSpan={5} className="py-2 text-slate-500">No steps sent yet.</td></tr>}</tbody></table></Card>
      <div className="grid md:grid-cols-3 gap-3">
        <Card title="WhatsApp / SMS delivery"><div className="grid grid-cols-2 gap-2"><Stat label="Sent" value={r.messages.total} /><Stat label="Delivered" value={r.messages.delivered + r.messages.read} sub={pct(r.messages.delivered + r.messages.read, r.messages.total)} /><Stat label="Read" value={r.messages.read} /><Stat label="Failed" value={r.messages.failed} />{r.messages.mock > 0 && <Stat label="Mock (not really sent)" value={r.messages.mock} />}</div></Card>
        <Card title="Email"><div className="grid grid-cols-2 gap-2"><Stat label="Sent" value={r.email.sent} /><Stat label="Opened" value={r.email.opened} sub={pct(r.email.opened, r.email.sent)} /><Stat label="Clicked" value={r.email.clicked} sub={pct(r.email.clicked, r.email.sent)} /><Stat label="Bounced" value={r.email.bounced} /><Stat label="Spam complaints" value={r.email.complained} /></div></Card>
        <Card title="Calls"><div className="grid grid-cols-2 gap-2"><Stat label="Total" value={r.calls.total} />{Object.entries(r.calls.byOutcome).map(([k, v]) => <Stat key={k} label={k.replace("_", " ")} value={v} />)}</div></Card>
      </div>
    </div>
  );
}
