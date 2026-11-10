// WhatsApp stack on a REAL Postgres (provider runs in mock mode — no keys, no network):
//   TEST_DATABASE_URL=postgresql://… npx vitest run lib/whatsapp/whatsapp.integration   (skipped otherwise)
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("WhatsApp: dedupe, broadcast, receipts, rules, media, config (Postgres)", () => {
  const tag = `wa${Date.now()}`;
  const num = (n: number) => `98${String(Date.now()).slice(-7)}${n}`.slice(0, 10); // 10-digit Indian numbers
  const a = num(1), b = num(2), c = num(3);
  let db: import("@/lib/db/query").Db;
  const ids: { broadcast?: string; rule?: string } = {};

  beforeAll(async () => {
    process.env.DATABASE_URL = url; process.env.AUTH_JWT_SECRET = "test-secret-for-wa-config";
    for (const k of ["ANTHROPIC_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "WHATSAPP_CLOUD_TOKEN", "WHATSAPP_QR_URL", "WHATSAPP_PROVIDER"]) delete process.env[k];
    db = (await import("@/lib/db")).getDb();
  });
  afterAll(async () => {
    await db.from("wa_broadcasts").delete().like("name", `${tag}%`);
    await db.from("wa_auto_rules").delete().like("name", `${tag}%`);
    await db.from("suppressions").delete().like("reason", `${tag}%`);
    await db.from("conversations").delete().like("contact_phone", `%${a}`);
    await db.from("conversations").delete().like("contact_phone", `%${b}`);
    await db.from("conversations").delete().like("contact_phone", `%${c}`);
    await db.from("comms_settings").delete().eq("key", "whatsapp_config");
    await (await import("@/lib/db")).closeDb();
  });

  it("an inbound message retried by the provider is recorded and processed only once", async () => {
    const { recordInboundMessage } = await import("@/lib/actions/conversations");
    const first = await recordInboundMessage("whatsapp", `+91${a}`, "hello", `wamid.${tag}`);
    const retry = await recordInboundMessage("whatsapp", `+91${a}`, "hello", `wamid.${tag}`);
    expect(first.duplicate).toBeFalsy();
    expect(retry.duplicate).toBe(true);
    const { data } = await db.from("messages").select("id").eq("provider_message_id", `wamid.${tag}`);
    expect(data).toHaveLength(1);
  });

  it("the DB itself rejects a duplicate inbound id (unique index backs the app check)", async () => {
    const { data: conv } = await db.from("conversations").select("id").like("contact_phone", `%${a}`).single();
    const { error } = await db.from("messages").insert({ conversation_id: conv!.id, direction: "inbound", body: "x", provider_message_id: `wamid.${tag}` });
    expect(error?.code).toBe("23505");
  });

  it("broadcast: dedupes, skips DNC + invalid, sends, reports, pauses/resumes/cancels", async () => {
    const { addSuppression } = await import("@/lib/compliance/dnc");
    await addSuppression({ phone: `+91${c}` }, { reason: `${tag} dnc`, source: "test" });
    const bc = await import("./broadcast");
    const r = await bc.createBroadcast({
      name: `${tag} promo`, mode: "text", body: "Hi {{firstName}}!", optOutFooter: true,
      audience: { pasted: `Asha Sharma, ${a}\nRahul, +91 ${b}\nDuplicate, ${a}\nDNC Guy, ${c}\nnot a number` },
    });
    expect(r.ok).toBe(true);
    ids.broadcast = r.id!;
    expect(r.total).toBe(3); expect(r.skipped).toBe(1); // a, b, c unique; c is on DNC

    expect((await bc.setBroadcastStatus(r.id!, "start")).status).toBe("running");
    const rep = await bc.runBroadcastBatch(r.id!, 10_000);
    expect(rep.sent).toBe(2); expect(rep.status).toBe("completed");

    const { data: rec } = await db.from("wa_broadcast_recipients").select("phone,status,error").eq("broadcast_id", r.id!);
    expect(rec!.find((x) => x.phone === `+91${c}`)?.status).toBe("skipped");
    expect(rec!.filter((x) => x.status === "sent")).toHaveLength(2);
    const { data: msgs } = await db.from("messages").select("body,sent_by").eq("sent_by", "broadcast").like("body", "Hi Asha!%");
    expect(msgs!.length).toBeGreaterThan(0);
    expect(msgs![0].body).toContain("Reply STOP to opt out.");
  });

  it("delivery receipts update the recipient; a reply is attributed to the broadcast", async () => {
    const { applyDeliveryStatus } = await import("@/lib/messaging/status");
    const { markBroadcastReply } = await import("./broadcast");
    const id = `wamid.rcpt.${tag}`;
    await db.from("wa_broadcast_recipients").update({ provider_message_id: id }).eq("broadcast_id", ids.broadcast!).eq("phone", `+91${a}`);
    await applyDeliveryStatus(id, "delivered");
    await applyDeliveryStatus(id, "read");
    await applyDeliveryStatus(id, "delivered"); // never downgrades
    const { data: r1 } = await db.from("wa_broadcast_recipients").select("status,read_at").eq("provider_message_id", id).single();
    expect(r1!.status).toBe("read"); expect(r1!.read_at).toBeTruthy();
    await markBroadcastReply(`+91${a}`);
    const { data: r2 } = await db.from("wa_broadcast_recipients").select("replied_at").eq("provider_message_id", id).single();
    expect(r2!.replied_at).toBeTruthy();
  });

  it("pause stops a running broadcast; cancel skips what is left; retry re-queues failures", async () => {
    const bc = await import("./broadcast");
    const r = await bc.createBroadcast({ name: `${tag} second`, mode: "text", body: "x", audience: { pasted: `${num(4)}\n${num(5)}` } });
    await bc.setBroadcastStatus(r.id!, "start");
    expect((await bc.setBroadcastStatus(r.id!, "pause")).status).toBe("paused");
    expect((await bc.runBroadcastBatch(r.id!, 5000)).sent).toBe(0); // paused → nothing is sent
    expect((await bc.setBroadcastStatus(r.id!, "cancel")).status).toBe("cancelled");
    const { data } = await db.from("wa_broadcast_recipients").select("status").eq("broadcast_id", r.id!);
    expect(data!.every((x) => x.status === "skipped")).toBe(true);
    await db.from("wa_broadcast_recipients").update({ status: "failed" }).eq("broadcast_id", ids.broadcast!).eq("phone", `+91${b}`);
    expect((await bc.retryFailed(ids.broadcast!)).requeued).toBe(1);
  });

  it("keyword auto-reply: matches by priority, fills placeholders, own cooldown, doesn't spend the AI allowance", async () => {
    const { data: rule } = await db.from("wa_auto_rules").insert({ name: `${tag} price`, keywords: "price, kitne ka", response: "Hi {{firstName}}, plans start at 4999.", priority: 1 }).select("id").single();
    ids.rule = rule!.id as string;
    const { maybeAutoRespond } = await import("@/lib/comms/autoReply");
    const { recordInboundMessage } = await import("@/lib/actions/conversations");
    const { conversationId } = await recordInboundMessage("whatsapp", `+91${b}`, "bhai ye kitne ka hai", `wamid.r1.${tag}`);
    await db.from("conversations").update({ contact_name: "Rahul Verma" }).eq("id", conversationId!);
    expect(await maybeAutoRespond({ conversationId: conversationId!, phone: `+91${b}`, text: "bhai ye kitne ka hai", channel: "whatsapp" })).toBe("auto");
    const { data: out } = await db.from("messages").select("body,sent_by").eq("conversation_id", conversationId!).eq("direction", "outbound");
    expect(out!.some((m) => m.body === "Hi Rahul, plans start at 4999.")).toBe(true);
    const { data: conv } = await db.from("conversations").select("last_auto_reply_at,last_rule_reply_at").eq("id", conversationId!).single();
    expect(conv!.last_rule_reply_at).toBeTruthy(); expect(conv!.last_auto_reply_at).toBeFalsy();
    // same rule again right away → blocked by the 5-minute rule cooldown
    expect(await maybeAutoRespond({ conversationId: conversationId!, phone: `+91${b}`, text: "price?", channel: "whatsapp" })).toBeNull();
    const { data: rule2 } = await db.from("wa_auto_rules").select("hits").eq("id", ids.rule).single();
    expect(rule2!.hits).toBe(1);
  });

  it("inbound media is stored and the signed URL verifies (tampered signature does not)", async () => {
    const { saveInboundMedia, verifyMediaSig } = await import("./media");
    const url = await saveInboundMedia({ data: Buffer.from("fake-png-bytes"), mime: "image/png", filename: "a.png" });
    expect(url).toMatch(/^\/api\/whatsapp\/media\/[0-9a-f-]{36}\?sig=[0-9a-f]{32}$/);
    const id = url!.split("/").pop()!.split("?")[0], sig = url!.split("sig=")[1];
    expect(verifyMediaSig(id, sig)).toBe(true);
    expect(verifyMediaSig(id, sig.replace(/.$/, sig.endsWith("0") ? "1" : "0"))).toBe(false);
    const { data } = await db.from("wa_media").select("size,mime").eq("id", id).single();
    expect(data).toMatchObject({ size: 14, mime: "image/png" });
    await db.from("wa_media").delete().eq("id", id);
    expect(await saveInboundMedia({ data: Buffer.alloc(7 * 1024 * 1024), mime: "video/mp4" })).toBeNull(); // over the 6 MB cap
  });

  it("WhatsApp config: secrets are encrypted at rest, masked for the browser, and survive a masked re-save", async () => {
    const cfg = await import("./config");
    expect(await cfg.saveWaConfig({ provider: "cloud", cloud: { token: "EAAGsupersecret9876", phoneNumberId: "555", wabaId: "w1", verifyToken: "vt", appSecret: "as", templateName: "", templateLang: "en" } } as never)).toBe(true);
    const { data } = await db.from("comms_settings").select("value").eq("key", "whatsapp_config").single();
    expect(JSON.stringify(data!.value)).not.toContain("EAAGsupersecret9876");
    expect((data!.value as { cloud: { token: string } }).cloud.token.startsWith("enc:v1:")).toBe(true);
    const loaded = await cfg.loadWaConfig(true);
    expect(loaded.cloud.token).toBe("EAAGsupersecret9876");
    expect(cfg.maskWaConfig(loaded).cloud.token).toBe("••••9876");
    await cfg.saveWaConfig({ cloud: { ...cfg.maskWaConfig(loaded).cloud, phoneNumberId: "777" } } as never); // UI re-sends the mask
    const after = await cfg.loadWaConfig(true);
    expect(after.cloud.token).toBe("EAAGsupersecret9876"); expect(after.cloud.phoneNumberId).toBe("777");
    const env = await cfg.waEnv();
    expect(env.WHATSAPP_CLOUD_TOKEN).toBe("EAAGsupersecret9876"); expect(env.WHATSAPP_PROVIDER).toBe("cloud");
  });
});
