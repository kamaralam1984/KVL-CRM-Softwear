// A small, dependency-free query builder over plain Postgres (Neon).
//
// It deliberately mirrors the chainable API this codebase already uses everywhere
// (db.from("t").select(...).eq(...).order(...).limit(...), insert/update/upsert/delete,
// .single()/.maybeSingle(), { count, head }, embedded relations like "*, leads(name)"),
// so the ~80 server modules keep working unchanged on Neon.
//
// Every statement returns JSON produced by Postgres itself (to_jsonb), so numbers, timestamps,
// uuids, arrays and jsonb come back in exactly the shape the app already expects.
// All identifiers are validated; all values are bound parameters. Never throws — returns { data, error, count }.

import type { Pool } from "pg";

export interface DbError { message: string; code?: string; details?: string; hint?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DbResult<T = any[]> { data: T | null; error: DbError | null; count: number | null }

type Add = (v: unknown) => string; // registers a bound parameter, returns "$n"
type Frag = (add: Add) => string;
type Op = "select" | "insert" | "update" | "delete" | "upsert";

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
export function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid identifier "${name}"`);
  return `"${name}"`;
}

// ── schema metadata (cached) ─────────────────────────────────────────────────
interface Fk { src: string; srcCol: string; dst: string; dstCol: string }
interface Meta { fks: Fk[]; types: Map<string, Map<string, string>>; pks: Map<string, string[]> }
const metaCache = new WeakMap<Pool, Promise<Meta>>();

function loadMeta(pool: Pool): Promise<Meta> {
  let p = metaCache.get(pool);
  if (!p) {
    p = (async () => {
      const [fk, cols, pk] = await Promise.all([
        pool.query(`select tc.table_name src, kcu.column_name src_col, ccu.table_name dst, ccu.column_name dst_col
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
          join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
          where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`),
        pool.query(`select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'`),
        pool.query(`select tc.table_name, kcu.column_name from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
          where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public' order by kcu.ordinal_position`),
      ]);
      const types = new Map<string, Map<string, string>>();
      for (const r of cols.rows) { if (!types.has(r.table_name)) types.set(r.table_name, new Map()); types.get(r.table_name)!.set(r.column_name, r.data_type); }
      const pks = new Map<string, string[]>();
      for (const r of pk.rows) pks.set(r.table_name, [...(pks.get(r.table_name) ?? []), r.column_name]);
      return { fks: fk.rows.map((r) => ({ src: r.src, srcCol: r.src_col, dst: r.dst, dstCol: r.dst_col })), types, pks };
    })();
    p.catch(() => metaCache.delete(pool)); // don't cache a failure (e.g. tables not created yet)
    metaCache.set(pool, p);
  }
  return p;
}

// ── select-list parsing: "*, leads(name,company), alias:forms(name)" ─────────
interface Rel { alias: string; table: string; inner: string }
function splitTop(s: string): string[] {
  const out: string[] = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++; if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function parseSelect(sel: string): { cols: string[]; rels: Rel[] } {
  const cols: string[] = [], rels: Rel[] = [];
  for (const item of splitTop(sel || "*")) {
    const m = item.match(/^(?:([A-Za-z_]\w*):)?([A-Za-z_]\w*)(?:![\w]+)?\(([\s\S]*)\)$/);
    if (m) rels.push({ alias: m[1] ?? m[2], table: m[2], inner: m[3] });
    else cols.push(item.replace(/^([A-Za-z_]\w*):/, "")); // alias:col → col (aliases for plain columns unused here)
  }
  return { cols: cols.length || rels.length === 0 ? cols : ["*"], rels };
}

function buildSelectList(base: string, sel: string, meta: Meta, depth = 0): string[] {
  const { cols, rels } = parseSelect(sel);
  const out = cols.map((c) => (c === "*" ? `${ident(base)}.*` : `${ident(base)}.${ident(c)}`));
  if (!out.length && !rels.length) out.push(`${ident(base)}.*`);
  for (const r of rels) {
    if (depth > 2) throw new Error("Embedded relations nested too deeply");
    const toOne = meta.fks.find((f) => f.src === base && f.dst === r.table);
    const toMany = meta.fks.find((f) => f.src === r.table && f.dst === base);
    const inner = buildSelectList(r.table, r.inner, meta, depth + 1).join(", ");
    if (toOne) {
      out.push(`(select to_jsonb(x) from (select ${inner} from ${ident(r.table)} where ${ident(r.table)}.${ident(toOne.dstCol)} = ${ident(base)}.${ident(toOne.srcCol)} limit 1) x) as ${ident(r.alias)}`);
    } else if (toMany) {
      out.push(`coalesce((select jsonb_agg(to_jsonb(x)) from (select ${inner} from ${ident(r.table)} where ${ident(r.table)}.${ident(toMany.srcCol)} = ${ident(base)}.${ident(toMany.dstCol)}) x), '[]'::jsonb) as ${ident(r.alias)}`);
    } else throw new Error(`Could not find a relationship between "${base}" and "${r.table}"`);
  }
  return out;
}

// ── filters ──────────────────────────────────────────────────────────────────
const CMP: Record<string, string> = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE", ilike: "ILIKE" };

function parseList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  const s = String(v).trim().replace(/^\(/, "").replace(/\)$/, "");
  return s === "" ? [] : s.split(",").map((x) => x.trim().replace(/^"(.*)"$/, "$1"));
}

function filterFrag(col: string, op: string, value: unknown, colType?: string): Frag {
  const c = ident(col);
  return (add) => {
    if (op === "is") {
      const v = value === null || String(value) === "null" ? "NULL" : String(value) === "true" || value === true ? "TRUE" : String(value) === "false" || value === false ? "FALSE" : null;
      if (!v) throw new Error(`Invalid "is" value: ${String(value)}`);
      return `${c} IS ${v}`;
    }
    if (op === "in") return `${c} = ANY(${add(parseList(value))})`;
    if (op === "contains" || op === "cs") {
      const isJson = colType === "jsonb" || colType === "json";
      return isJson ? `${c} @> ${add(JSON.stringify(value))}::jsonb` : `${c} @> ${add(parseList(value))}`;
    }
    if (op === "eq" && value === null) return `${c} IS NULL`;
    if (op === "neq" && value === null) return `${c} IS NOT NULL`;
    const sql = CMP[op];
    if (!sql) throw new Error(`Unsupported filter operator "${op}"`);
    return `${c} ${sql} ${add(value)}`;
  };
}

function parseOrExpr(expr: string): Frag {
  const parts = splitTop(expr).map((term) => {
    const m = term.match(/^([A-Za-z_]\w*)\.(not\.)?(\w+)\.([\s\S]*)$/);
    if (!m) throw new Error(`Invalid or() term "${term}"`);
    const f = filterFrag(m[1], m[3], m[4]);
    return m[2] ? (add: Add) => `NOT (${f(add)})` : f;
  });
  return (add) => `(${parts.map((p) => p(add)).join(" OR ")})`;
}

// ── builder ──────────────────────────────────────────────────────────────────
type PoolGetter = () => Pool | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class QueryBuilder<R = any[]> implements PromiseLike<DbResult<R>> {
  private op: Op | null = null;
  private columns = "*";
  private returning: string | null = null;
  private filters: Frag[] = [];
  private filterCols: [string, string, unknown][] = [];
  private orders: string[] = [];
  private limitN: number | null = null;
  private offsetN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;
  private countMode = false;
  private head = false;
  private payload: Record<string, unknown>[] = [];
  private conflict: string[] | null = null;
  private ignoreDup = false;

  constructor(private table: string, private getPool: PoolGetter) {}

  select(columns = "*", opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }): this {
    if (this.op && this.op !== "select") this.returning = columns; // insert(...).select()
    else { this.op = "select"; this.columns = columns; }
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]): this { this.op = "insert"; this.payload = Array.isArray(values) ? values : [values]; return this; }
  update(values: Record<string, unknown>): this { this.op = "update"; this.payload = [values]; return this; }
  delete(): this { this.op = "delete"; return this; }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.op = "upsert"; this.payload = Array.isArray(values) ? values : [values];
    this.conflict = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : null;
    this.ignoreDup = Boolean(opts?.ignoreDuplicates);
    return this;
  }

  private f(col: string, op: string, value: unknown): this { this.filterCols.push([col, op, value]); return this; }
  eq(c: string, v: unknown) { return this.f(c, "eq", v); }
  neq(c: string, v: unknown) { return this.f(c, "neq", v); }
  gt(c: string, v: unknown) { return this.f(c, "gt", v); }
  gte(c: string, v: unknown) { return this.f(c, "gte", v); }
  lt(c: string, v: unknown) { return this.f(c, "lt", v); }
  lte(c: string, v: unknown) { return this.f(c, "lte", v); }
  like(c: string, v: unknown) { return this.f(c, "like", v); }
  ilike(c: string, v: unknown) { return this.f(c, "ilike", v); }
  is(c: string, v: unknown) { return this.f(c, "is", v); }
  in(c: string, v: unknown[]) { return this.f(c, "in", v); }
  contains(c: string, v: unknown) { return this.f(c, "contains", v); }
  filter(c: string, op: string, v: unknown) { return this.f(c, op, v); }
  match(obj: Record<string, unknown>) { for (const [k, v] of Object.entries(obj)) this.f(k, "eq", v); return this; }
  not(c: string, op: string, v: unknown): this {
    this.filters.push((add) => `NOT (${filterFrag(c, op, v)(add)})`);
    return this;
  }
  or(expr: string): this { this.filters.push(parseOrExpr(expr)); return this; }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orders.push(`${ident(col)} ${opts?.ascending === false ? "DESC" : "ASC"}${opts?.nullsFirst === true ? " NULLS FIRST" : opts?.nullsFirst === false ? " NULLS LAST" : ""}`);
    return this;
  }
  limit(n: number): this { this.limitN = n; return this; }
  range(from: number, to: number): this { this.offsetN = from; this.limitN = to - from + 1; return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): QueryBuilder<any> { this.singleMode = "single"; return this as unknown as QueryBuilder<any>; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle(): QueryBuilder<any> { this.singleMode = "maybe"; return this as unknown as QueryBuilder<any>; }

  then<R1 = DbResult<R>, R2 = never>(onfulfilled?: ((v: DbResult<R>) => R1 | PromiseLike<R1>) | null, onrejected?: ((e: unknown) => R2 | PromiseLike<R2>) | null): PromiseLike<R1 | R2> {
    return (this.execute() as Promise<DbResult<R>>).then(onfulfilled, onrejected);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async execute(): Promise<DbResult<any>> {
    const pool = this.getPool();
    if (!pool) return { data: null, error: { message: "DATABASE_URL is not configured", code: "NO_DATABASE" }, count: null };
    try {
      const meta = await loadMeta(pool);
      const colTypes = meta.types.get(this.table);
      const add = (params: unknown[]): Add => (v) => { params.push(v); return `$${params.length}`; };
      const whereOf = (params: unknown[]) => {
        const a = add(params);
        const frags = [...this.filterCols.map(([c, op, v]) => filterFrag(c, op, v, colTypes?.get(c))), ...this.filters].map((fr) => fr(a));
        return frags.length ? ` WHERE ${frags.join(" AND ")}` : "";
      };
      const wrap = (inner: string) => `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from (${inner}) t`;
      const T = ident(this.table);
      const params: unknown[] = [];
      let sql: string;
      let count: number | null = null;

      if (this.op === "select" || this.op === null) {
        if (this.countMode) {
          const cp: unknown[] = [];
          const r = await pool.query(`select count(*)::int as n from ${T}${whereOf(cp)}`, cp);
          count = r.rows[0].n as number;
          if (this.head) return { data: null, error: null, count };
        }
        const list = buildSelectList(this.table, this.columns, meta).join(", ");
        sql = wrap(`select ${list} from ${T}${whereOf(params)}${this.orders.length ? ` ORDER BY ${this.orders.join(", ")}` : ""}${this.limitN != null ? ` LIMIT ${Math.max(0, Math.floor(this.limitN))}` : ""}${this.offsetN != null ? ` OFFSET ${Math.max(0, Math.floor(this.offsetN))}` : ""}`);
      } else {
        const a = add(params);
        const enc = (col: string, v: unknown) => {
          const t = colTypes?.get(col);
          return v !== null && v !== undefined && (t === "jsonb" || t === "json") ? JSON.stringify(v) : v;
        };
        let mutation: string;
        if (this.op === "delete") {
          mutation = `DELETE FROM ${T}${whereOf(params)}`;
        } else if (this.op === "update") {
          const row = this.payload[0] ?? {};
          const keys = Object.keys(row).filter((k) => row[k] !== undefined);
          if (!keys.length) return { data: null, error: { message: "update() called with no values" }, count: null };
          const set = keys.map((k) => `${ident(k)} = ${a(enc(k, row[k]))}`).join(", ");
          mutation = `UPDATE ${T} SET ${set}${whereOf(params)}`;
        } else {
          const keys = [...new Set(this.payload.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
          const rowsSql = keys.length
            ? this.payload.map((r) => `(${keys.map((k) => (r[k] === undefined ? "DEFAULT" : a(enc(k, r[k])))).join(", ")})`).join(", ")
            : "";
          mutation = keys.length ? `INSERT INTO ${T} (${keys.map(ident).join(", ")}) VALUES ${rowsSql}` : `INSERT INTO ${T} DEFAULT VALUES`;
          if (this.op === "upsert") {
            const target = this.conflict ?? meta.pks.get(this.table) ?? [];
            if (!target.length) return { data: null, error: { message: `upsert on "${this.table}" needs onConflict (no primary key found)` }, count: null };
            const upd = keys.filter((k) => !target.includes(k));
            mutation += ` ON CONFLICT (${target.map(ident).join(", ")}) ` + (this.ignoreDup
              ? "DO NOTHING"
              : `DO UPDATE SET ${(upd.length ? upd : [target[0]]).map((k) => `${ident(k)} = EXCLUDED.${ident(k)}`).join(", ")}`);
          }
        }
        if (this.returning === null) {
          await pool.query(mutation, params);
          return { data: null, error: null, count: null };
        }
        const cols = parseSelect(this.returning).cols;
        const proj = cols.length === 0 || cols.includes("*") ? "*" : cols.map(ident).join(", ");
        sql = `with r as (${mutation} RETURNING *) ${wrap(`select ${proj} from r`)}`;
      }

      const res = await pool.query(sql, params);
      const rows = (res.rows[0]?.data ?? []) as unknown[];
      if (this.singleMode) {
        if (rows.length === 1) return { data: rows[0], error: null, count };
        if (rows.length === 0 && this.singleMode === "maybe") return { data: null, error: null, count };
        return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows` }, count };
      }
      return { data: rows, error: null, count };
    } catch (err) {
      const e = err as { message?: string; code?: string; detail?: string; hint?: string };
      return { data: null, error: { message: e.message ?? String(err), code: e.code, details: e.detail, hint: e.hint }, count: null };
    }
  }
}

export class Db {
  constructor(private getPool: PoolGetter) {}
  from(table: string): QueryBuilder { return new QueryBuilder(table, this.getPool); }
  /** Raw parameterised SQL for the few places that need it. Never throws. */
  async sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<{ rows: T[]; error: DbError | null }> {
    const pool = this.getPool();
    if (!pool) return { rows: [], error: { message: "DATABASE_URL is not configured", code: "NO_DATABASE" } };
    try { return { rows: (await pool.query(text, params)).rows as T[], error: null }; }
    catch (err) { const e = err as { message?: string; code?: string }; return { rows: [], error: { message: e.message ?? String(err), code: e.code } }; }
  }
}
