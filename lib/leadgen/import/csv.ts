// CSV lead import — parses raw CSV text into RawLead[] with no external deps.
// Handles quoted fields (RFC-4180-ish: quotes, escaped "" quotes, embedded
// commas and newlines), a header row, and fuzzy column→field mapping.

import type { RawLead } from "@/lib/leadgen/types";

// --- Tiny robust CSV tokenizer -------------------------------------------
// Returns rows of string cells. Supports "quoted, fields", "" escapes,
// embedded newlines inside quotes, and \r\n or \n line endings.
function tokenizeCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = input.replace(/\r\n?/g, "\n"); // normalize newlines

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// --- Fuzzy header matching ------------------------------------------------
function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// For a given field, the header aliases we accept (normalized substrings).
const HEADER_ALIASES: Record<string, string[]> = {
  company: ["company", "organization", "organisation", "businessname", "business", "accountname", "companyname"],
  name: ["name", "contact", "contactname", "fullname", "firstname", "person"],
  email: ["email", "emailaddress", "mail", "workemail"],
  phone: ["phone", "mobile", "telephone", "tel", "phonenumber", "contactnumber"],
  website: ["website", "url", "web", "site", "domain", "homepage"],
  industry: ["industry", "sector", "vertical", "niche"],
  location: ["location", "city", "region", "country", "address", "state", "geo"],
  employees: ["employees", "employeecount", "headcount", "staff", "teamsize", "companysize", "size"],
  revenue: ["revenue", "annualrevenue", "revenueestimate", "turnover", "sales"],
};

// Given the header cells, produce field → column index.
function mapHeaders(headers: string[]): Record<string, number> {
  const normed = headers.map(norm);
  const map: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    let bestIdx = -1;
    let bestScore = 0;
    normed.forEach((h, idx) => {
      if (!h) return;
      for (const alias of aliases) {
        let score = 0;
        if (h === alias) score = 3;
        else if (h.startsWith(alias) || alias.startsWith(h)) score = 2;
        else if (h.includes(alias) || alias.includes(h)) score = 1;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      }
    });
    if (bestIdx >= 0) map[field] = bestIdx;
  }
  return map;
}

function cell(row: string[], idx: number | undefined): string | undefined {
  if (idx === undefined || idx < 0) return undefined;
  const v = row[idx];
  if (v === undefined) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function toEmployeeCount(v: string | undefined): number | undefined {
  if (!v) return undefined;
  // pull first integer out of e.g. "10-50", "~120 staff"
  const m = v.replace(/,/g, "").match(/\d+/);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse CSV text into RawLead[]. Empty rows are skipped. A row is kept only
 * if it yields a company (falls back to name). source is always "csv_import".
 */
export function parseCsvLeads(csv: string): RawLead[] {
  if (typeof csv !== "string" || !csv.trim()) return [];

  const rows = tokenizeCsv(csv);
  if (!rows.length) return [];

  // First non-empty row is the header.
  let headerIdx = 0;
  while (headerIdx < rows.length && rows[headerIdx].every((c) => !c.trim())) headerIdx++;
  if (headerIdx >= rows.length) return [];

  const headerMap = mapHeaders(rows[headerIdx]);
  const leads: RawLead[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c || !c.trim())) continue; // skip empty rows

    const company = cell(row, headerMap.company);
    const name = cell(row, headerMap.name);
    const resolvedCompany = company ?? name;
    if (!resolvedCompany) continue; // need at least a company/name

    const lead: RawLead = {
      name: name ?? resolvedCompany,
      company: resolvedCompany,
      email: cell(row, headerMap.email),
      phone: cell(row, headerMap.phone),
      website: cell(row, headerMap.website),
      industry: cell(row, headerMap.industry),
      location: cell(row, headerMap.location),
      employeeCount: toEmployeeCount(cell(row, headerMap.employees)),
      revenueEstimate: cell(row, headerMap.revenue),
      source: "csv_import",
      sourceId: `csv-${leads.length}`,
      raw: { row },
    };
    leads.push(lead);
  }

  return leads;
}
