#!/usr/bin/env node
// Applies lib/db/schema.sql to your database (idempotent — safe to re-run) and verifies the WhatsApp objects.
//
//   DATABASE_URL='postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require' node scripts/apply-schema.mjs
//   (or put DATABASE_URL in .env.local and run:  node --env-file=.env.local scripts/apply-schema.mjs)
//
// Never prints the connection string. Exits non-zero if the schema fails or an expected object is missing.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set."); process.exit(1); }

const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "db", "schema.sql"), "utf8");
const client = new pg.Client({ connectionString: url, ssl: /sslmode=require|neon\.tech/.test(url) ? { rejectUnauthorized: false } : undefined });

const EXPECT = {
  tables: ["wa_broadcasts", "wa_broadcast_recipients", "wa_media", "wa_auto_rules", "message_templates", "suppressions", "conversations", "messages"],
  columns: [["conversations", "last_rule_reply_at"], ["messages", "media_url"]],
  indexes: ["messages_inbound_provider_uidx"],
};

try {
  await client.connect();
  const host = new URL(url).hostname;
  console.log(`Connected to ${host} — applying lib/db/schema.sql …`);
  const notices = [];
  client.on("notice", (n) => notices.push(n.message));
  await client.query(sql);
  console.log("Schema applied.");

  let missing = 0;
  const has = async (q, p) => (await client.query(q, p)).rowCount > 0;
  for (const t of EXPECT.tables) { const ok = await has("select 1 from information_schema.tables where table_schema='public' and table_name=$1", [t]); if (!ok) missing++; console.log(`${ok ? "✔" : "✘"} table ${t}`); }
  for (const [t, c] of EXPECT.columns) { const ok = await has("select 1 from information_schema.columns where table_name=$1 and column_name=$2", [t, c]); if (!ok) missing++; console.log(`${ok ? "✔" : "✘"} column ${t}.${c}`); }
  for (const i of EXPECT.indexes) {
    const ok = await has("select 1 from pg_indexes where indexname=$1", [i]);
    if (!ok) console.log(`⚠ index ${i} not created${notices.some((m) => m.includes(i)) ? " — old duplicate inbound messages exist. Remove them, then re-run:\n   delete from messages a using messages b where a.direction='inbound' and b.direction='inbound' and a.provider_message_id = b.provider_message_id and a.provider_message_id is not null and a.ctid > b.ctid;" : ""}`);
    else console.log(`✔ index ${i}`);
  }
  if (missing) { console.error(`\n${missing} expected object(s) missing — check the output above.`); process.exitCode = 2; }
  else console.log("\nAll good.");
} catch (err) {
  console.error("Failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
