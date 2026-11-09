// Runs against a REAL Postgres: TEST_DATABASE_URL=postgresql://… npx vitest run lib/db
// (skipped otherwise). Apply lib/db/schema.sql to that database first.
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("query builder on Postgres", () => {
  let db: import("./query").Db;
  const tag = `t${Date.now()}`;
  let leadId: number;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const mod = await import("./index");
    db = mod.getDb();
  });
  afterAll(async () => {
    await db.from("tasks").delete().like("title", `${tag}%`);
    await db.from("leads").delete().like("name", `${tag}%`);
    await db.from("suppressions").delete().like("reason", `${tag}%`);
    await db.from("followup_sequences").delete().eq("key", `${tag}-seq`);
    await (await import("./index")).closeDb();
  });

  it("insert + select().single() returns typed JSON (numbers, arrays, timestamps)", async () => {
    const { data, error } = await db.from("leads").insert({ name: `${tag}-A`, company: "Acme", email: "a@x.com", score: 70, value: 1250.5, tags: ["x", "y"] }).select().single();
    expect(error).toBeNull();
    leadId = data.id;
    expect(typeof data.id).toBe("number");         // bigserial → number, not "12"
    expect(data.value).toBe(1250.5);                // numeric → number
    expect(data.tags).toEqual(["x", "y"]);          // text[] round-trips
    expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
  });

  it("insert without select returns no data; batch insert works", async () => {
    const r = await db.from("leads").insert([{ name: `${tag}-B` }, { name: `${tag}-C`, company: "Z" }]);
    expect(r.error).toBeNull(); expect(r.data).toBeNull();
    const { data } = await db.from("leads").select("name").like("name", `${tag}-%`).order("name");
    expect(data!.map((x: { name: string }) => x.name)).toEqual([`${tag}-A`, `${tag}-B`, `${tag}-C`]);
  });

  it("filters: eq/neq/in/not-in/is/ilike/or/gte/limit/order", async () => {
    const names = async (q: ReturnType<typeof db.from>) => ((await q).data as { name: string }[]).map((x) => x.name);
    const base = () => db.from("leads").select("name").like("name", `${tag}-%`).order("name");
    expect(await names(base().eq("company", "Z"))).toEqual([`${tag}-C`]);
    expect(await names(base().neq("company", "Z"))).toEqual([`${tag}-A`, `${tag}-B`]);
    expect(await names(base().in("name", [`${tag}-A`, `${tag}-C`]))).toEqual([`${tag}-A`, `${tag}-C`]);
    expect(await names(base().not("name", "in", `(${tag}-A,${tag}-B)`))).toEqual([`${tag}-C`]);
    expect(await names(base().is("email", null))).toEqual([]);                       // default is '' not NULL
    expect(await names(base().not("email", "is", null).eq("company", "Z"))).toEqual([`${tag}-C`]);
    expect(await names(base().ilike("company", "acm%"))).toEqual([`${tag}-A`]);
    expect(await names(base().or(`company.eq.Z,name.ilike.%-B`))).toEqual([`${tag}-B`, `${tag}-C`]);
    expect(await names(base().gte("score", 60))).toEqual([`${tag}-A`]);
    expect(await names(db.from("leads").select("name").like("name", `${tag}-%`).order("name", { ascending: false }).limit(1))).toEqual([`${tag}-C`]);
  });

  it("update().select(), match(), delete()", async () => {
    const u = await db.from("leads").update({ company: "Acme2", score: 99 }).eq("id", leadId).select("id,company,score").single();
    expect(u.data).toEqual({ id: leadId, company: "Acme2", score: 99 });
    await db.from("leads").update({ stage: "Qualified" }).match({ name: `${tag}-B`, company: "" });
    const { data } = await db.from("leads").select("stage").eq("name", `${tag}-B`).single();
    expect(data.stage).toBe("Qualified");
    const del = await db.from("leads").delete().eq("name", `${tag}-C`);
    expect(del.error).toBeNull();
    expect((await db.from("leads").select("id").eq("name", `${tag}-C`).maybeSingle()).data).toBeNull();
  });

  it("single() errors with PGRST116 for 0 or many rows; maybeSingle is null for 0", async () => {
    const none = await db.from("leads").select("id").eq("name", "does-not-exist").single();
    expect(none.error?.code).toBe("PGRST116");
    const many = await db.from("leads").select("id").like("name", `${tag}-%`).single();
    expect(many.error?.code).toBe("PGRST116");
    expect((await db.from("leads").select("id").eq("name", "nope").maybeSingle()).error).toBeNull();
  });

  it("count + head", async () => {
    const r = await db.from("leads").select("id", { count: "exact", head: true }).like("name", `${tag}-%`);
    expect(r.error).toBeNull(); expect(r.data).toBeNull(); expect(r.count).toBe(2);
    const r2 = await db.from("leads").select("id", { count: "exact" }).like("name", `${tag}-%`).limit(1);
    expect(r2.count).toBe(2); expect((r2.data as unknown[]).length).toBe(1);
  });

  it("upsert: onConflict updates, ignoreDuplicates keeps the original", async () => {
    await db.from("suppressions").insert({ phone: "9000000001", channel: "all", reason: `${tag}-1` });
    const dup = await db.from("suppressions").insert({ phone: "9000000001", channel: "all", reason: `${tag}-2` });
    expect(dup.error?.code).toBe("23505");           // unique violation surfaces with its PG code
    await db.from("suppressions").delete().eq("phone", "9000000001");

    const first = await db.from("followup_sequences").upsert({ key: `${tag}-seq`, name: "One", steps: [{ atHours: 1, channel: "email", body: "hi" }] }, { onConflict: "key" }).select("id,name").single();
    expect(first.data.name).toBe("One");
    const second = await db.from("followup_sequences").upsert({ key: `${tag}-seq`, name: "Two", steps: [{ atHours: 2 }] }, { onConflict: "key" }).select("id,name").single();
    expect(second.data.name).toBe("Two"); expect(second.data.id).toBe(first.data.id);
    const ign = await db.from("followup_sequences").upsert({ key: `${tag}-seq`, name: "Three" }, { onConflict: "key", ignoreDuplicates: true }).select("id").maybeSingle();
    expect(ign.data).toBeNull();
    const { data } = await db.from("followup_sequences").select("name,steps").eq("key", `${tag}-seq`).single();
    expect(data.name).toBe("Two");
    expect(data.steps).toEqual([{ atHours: 2 }]);    // jsonb ARRAY stored as jsonb (not a pg array literal)
  });

  it("embedded relations: to-one (object) and to-many (array)", async () => {
    await db.from("followup_enrollments").insert({ lead_id: leadId, sequence_key: `${tag}-e` });
    const one = await db.from("followup_enrollments").select("id, leads(name,company)").eq("lead_id", leadId).single();
    expect(one.data.leads).toEqual({ name: `${tag}-A`, company: "Acme2" });
    const many = await db.from("leads").select("id, followup_enrollments(sequence_key)").eq("id", leadId).single();
    expect(many.data.followup_enrollments).toEqual([{ sequence_key: `${tag}-e` }]);
    const star = await db.from("followup_enrollments").select("*, leads(name)").eq("lead_id", leadId).single();
    expect(star.data.status).toBe("active"); expect(star.data.leads.name).toBe(`${tag}-A`);
  });

  it("reports errors instead of throwing (bad table, bad identifier, injection attempt)", async () => {
    expect((await db.from("no_such_table").select("*")).error).not.toBeNull();
    expect((await db.from("leads; drop table leads").select("*")).error?.message).toMatch(/Invalid identifier/);
    expect((await db.from("leads").select("*").eq("name; drop table leads", "x")).error?.message).toMatch(/Invalid identifier/);
    const evil = await db.from("leads").select("id").eq("name", "x' OR '1'='1");
    expect(evil.error).toBeNull(); expect(evil.data).toEqual([]);
    expect((await db.from("leads").select("id").limit(1)).error).toBeNull(); // table still there
  });

  it("raw sql helper", async () => {
    const r = await db.sql<{ n: number }>("select 1 + $1::int as n", [41]);
    expect(r.rows[0].n).toBe(42);
  });
});
