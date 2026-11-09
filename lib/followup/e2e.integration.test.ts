// End-to-end on a REAL Postgres (all channels run in mock mode — no provider keys, no network):
//   TEST_DATABASE_URL=postgresql://… npx vitest run lib/followup/e2e   (skipped otherwise)
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("communications stack end-to-end on Postgres", () => {
  const tag = `e2e${Date.now()}`;
  const phone = "+9198" + String(Date.now()).slice(-8);
  const email = `${tag}@example.com`;
  let db: import("@/lib/db/query").Db;
  let eng: typeof import("./engine");
  let leadId: number;
  // 11:30 IST today — inside everybody's allowed sending window
  const t = new Date(); const noon = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 6, 0));
  const enrollment = async (id = leadId) => (await db.from("followup_enrollments").select("*").eq("lead_id", id).single()).data;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    delete process.env.ANTHROPIC_API_KEY; delete process.env.TWILIO_ACCOUNT_SID; delete process.env.RESEND_API_KEY;
    db = (await import("@/lib/db")).getDb();
    eng = await import("./engine");
    const { createLead } = await import("@/lib/actions/leads");
    const lead = await createLead({ name: `${tag} Rahul`, company: "Acme Co", email, phone, score: 60, status: "warm", stage: "Discovery", value: 5000, owner: "Sam", avatar: "RS", last_contact: "", tags: [] } as never);
    leadId = lead.id as number;
  });
  afterAll(async () => {
    await db.from("leads").delete().like("name", `${tag}%`);
    await db.from("suppressions").delete().eq("source", "inbound_stop").like("reason", "STOP%");
    await db.from("tasks").delete().like("company", "Acme Co");
    await db.from("notifications").delete().like("title", "%Acme Co%");
    await db.from("conversations").delete().eq("contact_phone", phone.replace(/\D/g, "").length ? phone : phone);
    await db.from("reminders").delete().like("title", `${tag}%`);
    await db.from("email_log").delete().eq("to_email", email);
    await (await import("@/lib/db")).closeDb();
  });

  it("new lead is auto-enrolled with a snapshot of the 90-day sequence", async () => {
    const e = await enrollment();
    expect(e.status).toBe("active");
    expect(e.steps.length).toBeGreaterThanOrEqual(20);
    expect(e.tz_offset_min).toBe(330);
    expect(new Date(e.ends_at).getTime() - new Date(e.started_at).getTime()).toBe(90 * 86_400_000);
  });

  it("cron sends due steps (mock), logs events + inbox rows, advances the step, never double-sends", async () => {
    await db.from("followup_enrollments").update({ next_run_at: new Date(noon.getTime() - 60_000).toISOString() }).eq("lead_id", leadId);
    const r = await eng.runDueSteps(noon);
    expect(r.processed).toBeGreaterThanOrEqual(1);
    expect(r.sent).toBeGreaterThanOrEqual(1);
    expect(r.mock).toBeGreaterThanOrEqual(1);              // mock sends are counted separately, not passed off as real
    const e = await enrollment();
    expect(e.step_index).toBe(1);
    const ev = await db.from("followup_events").select("kind,detail").eq("enrollment_id", e.id);
    expect(ev.data!.some((x: { kind: string }) => x.kind === "step_sent")).toBe(true);
    const r2 = await eng.runDueSteps(noon);                // nothing is due now → no repeat
    expect(r2.sent).toBe(0);
    const msg = await db.from("messages").select("status,sent_by").eq("sent_by", "automation").limit(5);
    expect(msg.data!.some((m: { status: string }) => m.status === "mock")).toBe(true);
  });

  it("client reply → drip pauses, team is alerted, chat can be assigned", async () => {
    const r = await eng.handleInboundReply({ phone }, "what is the price?", "WhatsApp");
    expect(r).toMatchObject({ intent: "normal", affected: 1, leadOwner: "Sam" });
    expect((await enrollment()).status).toBe("replied_waiting");
    const n = await db.from("notifications").select("title").eq("lead_id", leadId);
    expect(n.data!.length).toBeGreaterThanOrEqual(1);
  });

  it("24h without a human reply → AI soft nudge (template fallback), then stops at the cap", async () => {
    await db.from("followup_enrollments").update({ last_inbound_at: new Date(noon.getTime() - 25 * 3_600_000).toISOString(), last_human_reply_at: null }).eq("lead_id", leadId);
    const r = await eng.runAiNudges(noon);
    expect(r.nudged).toBe(1);
    expect((await enrollment()).ai_nudge_count).toBe(1);
    const again = await eng.runAiNudges(noon);             // 24h gap not elapsed since the nudge
    expect(again.nudged).toBe(0);
    const tasks = await db.from("tasks").select("title").like("title", "%Reply overdue%").eq("company", "Acme Co");
    expect(tasks.data!.length).toBe(1);
  });

  it("human reply clears the 24h clock and resumes the drip", async () => {
    await eng.handleHumanReply({ phone });
    const e = await enrollment();
    expect(e.status).toBe("active");
    expect(e.last_human_reply_at).not.toBeNull();
    expect(new Date(e.next_run_at).getTime()).toBeGreaterThan(Date.now() + 60 * 3_600_000); // ≈72h out
  });

  it("'ready to pay' reply → payment_ready, high-priority alert, payment link auto-sent", async () => {
    const { saveCommsSetting } = await import("@/lib/comms/settings");
    await saveCommsSetting("links", { paymentLink: "https://pay.example.com/x", bookingLink: "" });
    const r = await eng.handleInboundReply({ phone }, "I'm ready to start, send me the payment link", "WhatsApp");
    expect(r.intent).toBe("payment_intent");
    const e = await enrollment();
    expect(e.status).toBe("payment_ready");
    const ev = await db.from("followup_events").select("detail").eq("enrollment_id", e.id).like("detail", "Auto payment link%");
    expect(ev.data!.length).toBe(1);
  });

  it("STOP → opted out everywhere: DNC list, every sender blocked", async () => {
    const lead2 = await (await import("@/lib/actions/leads")).createLead({ name: `${tag} Stopper`, company: "Acme Co", email: `${tag}-s@example.com`, phone: "+9197" + String(Date.now()).slice(-8), score: 50, status: "warm", stage: "Discovery", value: 0, owner: "", avatar: "SS", last_contact: "", tags: [] } as never);
    const p2 = (lead2 as { phone: string }).phone;
    const r = await eng.handleInboundReply({ phone: p2 }, "STOP", "WhatsApp");
    expect(r.intent).toBe("optout");
    expect((await enrollment(lead2.id as number)).status).toBe("stopped");
    const { isSuppressed } = await import("@/lib/compliance/dnc");
    expect(await isSuppressed({ phone: p2 }, "whatsapp")).toBe(true);
    expect(await isSuppressed({ email: `${tag}-s@example.com` }, "email")).toBe(true);
    const { sendWhatsApp, sendSms, sendEmail } = await import("@/lib/messaging/send");
    expect(await sendWhatsApp(p2, "hi")).toMatchObject({ ok: false, suppressed: true });
    expect(await sendSms(p2, "hi")).toMatchObject({ ok: false, suppressed: true });
    expect(await sendEmail(`${tag}-s@example.com`, "s", "b")).toMatchObject({ ok: false, suppressed: true });
    expect((await sendWhatsApp(p2, "internal alert", { bypassSuppression: true })).suppressed).toBeUndefined(); // team alerts still work
    expect((await sendWhatsApp("+919000000000", "hi")).ok).toBe(true);    // unrelated contacts unaffected
  });

  it("call outcomes: callback → reminder; not_picked → fallback message; do_not_call → DNC", async () => {
    const { logCallOutcome } = await import("@/lib/telephony/outcomes");
    const lead3 = await (await import("@/lib/actions/leads")).createLead({ name: `${tag} Caller`, company: "Acme Co", email: `${tag}-c@example.com`, phone: "+9196" + String(Date.now()).slice(-8), score: 50, status: "warm", stage: "Discovery", value: 0, owner: "Sam", avatar: "CC", last_contact: "", tags: [] } as never);
    const id3 = lead3.id as number;
    const cb = await logCallOutcome({ leadId: id3, outcome: "callback", callbackAt: new Date(Date.now() + 86_400_000), notes: "after lunch" });
    expect(cb.ok).toBe(true);
    const rem = await db.from("reminders").select("kind,audience,status").eq("lead_id", id3);
    expect(rem.data).toEqual([{ kind: "callback", audience: "team", status: "pending" }]);
    const np = await logCallOutcome({ leadId: id3, outcome: "not_picked" });
    expect(np.action).toMatch(/WhatsApp sent/);
    const dnc = await logCallOutcome({ leadId: id3, outcome: "do_not_call" });
    expect(dnc.ok).toBe(true);
    const { isSuppressed } = await import("@/lib/compliance/dnc");
    expect(await isSuppressed({ phone: (lead3 as { phone: string }).phone }, "call")).toBe(true);
    const logs = await db.from("call_logs").select("outcome").eq("lead_id", id3);
    expect(logs.data!.map((x: { outcome: string }) => x.outcome).sort()).toEqual(["callback", "do_not_call", "not_picked"]);
  });

  it("reminder engine: scans tasks/meetings/invoices, runs due reminders, skips completed work", async () => {
    const rem = await import("@/lib/reminders/engine");
    const today = new Date();
    await db.from("tasks").insert({ title: `${tag} call client`, priority: "high", due: "Today", assignee: "Sam", status: "pending", company: "Acme Co" });
    const done = await db.from("tasks").insert({ title: `${tag} done task`, priority: "low", due: "Today", assignee: "Sam", status: "completed", company: "Acme Co" }).select("id").single();
    await db.from("calendar_events").insert({ day: today.getUTCDate(), month: today.getUTCMonth(), year: today.getUTCFullYear(), title: `${tag} demo`, time: "11:00 PM", type: "meeting", color: "blue", contact_phone: phone, contact_email: email });
    await db.from("invoices").insert({ id: `${tag}-INV`, client: "Acme Co", amount: 12000, status: "pending", due: today.toISOString().slice(0, 10), contact_phone: phone, contact_email: email });
    await rem.createReminder({ kind: "custom", audience: "team", assignee: "Sam", title: `${tag} manual`, remindAt: new Date(noon.getTime() - 60_000), dedupeKey: `${tag}:m` });
    expect(await rem.createReminder({ kind: "custom", audience: "team", title: `${tag} manual`, remindAt: new Date(), dedupeKey: `${tag}:m` })).toBeNull(); // dedupe

    const r = await rem.runDueReminders(noon);
    expect(r.scanned).toBeGreaterThan(0);
    expect(r.sent).toBeGreaterThanOrEqual(1);
    const mine = await db.from("reminders").select("title,status,kind,audience").or(`title.like.${tag}%,dedupe_key.like.task:%:due,dedupe_key.like.inv:${tag}%,dedupe_key.like.cal:%`);
    expect(mine.data!.some((x: { title: string; status: string }) => x.title === `${tag} manual` && x.status === "sent")).toBe(true);
    const completed = await db.from("reminders").select("status").eq("dedupe_key", `task:${done.data.id}:due`).maybeSingle();
    expect(completed.data).toBeNull();                  // already-completed tasks never get a reminder

    // A task completed AFTER its reminder was scheduled is skipped when the reminder comes due.
    const open = await db.from("tasks").insert({ title: `${tag} finish later`, priority: "low", due: "Today", assignee: "Sam", status: "pending", company: "Acme Co" }).select("id").single();
    await rem.scanSources(noon);
    await db.from("tasks").update({ status: "completed" }).eq("id", open.data.id);
    await rem.runDueReminders(new Date(noon.getTime() + 2 * 86_400_000));
    const later = await db.from("reminders").select("status").eq("dedupe_key", `task:${open.data.id}:due`).single();
    expect(later.data.status).toBe("skipped");
    await db.from("tasks").delete().like("title", `${tag}%`);
    await db.from("calendar_events").delete().like("title", `${tag}%`);
    await db.from("invoices").delete().like("id", `${tag}%`);
  });

  it("reports + settings + templates + notifications server actions work on real data", async () => {
    const c = await import("@/lib/actions/comms");
    const rep = await c.getCommsReport();
    expect(rep?.funnel.enrolled).toBeGreaterThanOrEqual(3);
    expect(rep!.steps.length).toBeGreaterThanOrEqual(1);
    expect(rep!.dncCount).toBeGreaterThanOrEqual(1);
    expect(await c.saveTemplate({ kind: "quick_reply", name: `${tag} qr`, body: "Thanks!" })).toBe(true);
    expect((await c.listTemplates("quick_reply")).some((t) => t.name === `${tag} qr`)).toBe(true);
    await db.from("message_templates").delete().like("name", `${tag}%`);
    const s = await c.loadCommsSettings();
    expect(s?.links.paymentLink).toBe("https://pay.example.com/x");
    const seq = await c.saveSequence([{ atHours: 48, channel: "email", subject: "s", body: "b" }, { atHours: 0, channel: "whatsapp", body: "hi {{firstName}}" }]);
    expect(seq.ok).toBe(true);
    expect((await c.loadSequence())?.steps.map((x) => x.atHours)).toEqual([0, 48]);    // sorted, persisted as jsonb array
    await c.resetSequence();
    const n = await c.getNotifications();
    expect(n.items.length).toBeGreaterThan(0);
    const inbox = await c.getInbox();
    expect(inbox.some((x) => String(x.contact_phone).includes(phone.slice(-8)) )).toBe(true);
    expect(await c.listSuppressions()).not.toHaveLength(0);
  });

  it("endFollowUpByContact (payment webhook) closes the loop", async () => {
    const lead4 = await (await import("@/lib/actions/leads")).createLead({ name: `${tag} Payer`, company: "Acme Co", email: `${tag}-p@example.com`, phone: "+9195" + String(Date.now()).slice(-8), score: 50, status: "warm", stage: "Discovery", value: 0, owner: "", avatar: "PP", last_contact: "", tags: [] } as never);
    await eng.endFollowUpByContact({ email: `${tag}-p@example.com` }, "won", "Payment received (Razorpay)");
    expect((await enrollment(lead4.id as number)).status).toBe("won");
  });
});
