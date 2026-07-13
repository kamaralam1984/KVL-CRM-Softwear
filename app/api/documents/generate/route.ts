// POST /api/documents/generate — generate a business document (Proposal,
// Quotation, Invoice, Agreement, NDA, AMC) and return it as HTML for the given
// output format (html | pdf | docx).
//
// Body:
//   { "input": DocInput, "format"?: "html" | "pdf" | "docx" }
//
// GET (quick test / direct link):
//   ?type=proposal&company=Acme&clientName=Jane&format=pdf
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <DOCUMENTS_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { docResponseHeaders, generateDocument } from "@/lib/documents/generate";
import type { DocFormat, DocInput, DocService, DocType } from "@/lib/documents/types";

export const dynamic = "force-dynamic";

const DOC_TYPES: DocType[] = [
  "proposal",
  "quotation",
  "invoice",
  "agreement",
  "nda",
  "amc",
];

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.DOCUMENTS_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

function isDocType(value: unknown): value is DocType {
  return typeof value === "string" && (DOC_TYPES as string[]).includes(value);
}

function normalizeFormat(value: unknown): DocFormat {
  return value === "pdf" || value === "docx" ? value : "html";
}

// Coerce loosely-typed JSON into a DocInput. Returns null if `type`/`company`
// are missing or invalid.
function coerceInput(raw: unknown): DocInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (!isDocType(o.type)) return null;
  if (typeof o.company !== "string" || !o.company.trim()) return null;

  const services: DocService[] | undefined = Array.isArray(o.services)
    ? o.services
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({
          name: String(s.name ?? "Item"),
          price: Number(s.price) || 0,
          description:
            typeof s.description === "string" ? s.description : undefined,
        }))
    : undefined;

  return {
    type: o.type,
    company: o.company,
    clientName: typeof o.clientName === "string" ? o.clientName : undefined,
    services,
    total:
      typeof o.total === "number" && Number.isFinite(o.total)
        ? o.total
        : undefined,
    senderCompany:
      typeof o.senderCompany === "string" ? o.senderCompany : undefined,
    senderName: typeof o.senderName === "string" ? o.senderName : undefined,
    validityDays:
      typeof o.validityDays === "number" && Number.isFinite(o.validityDays)
        ? o.validityDays
        : undefined,
    notes: typeof o.notes === "string" ? o.notes : undefined,
    // Date is supplied here (templates never call new Date() themselves).
    date:
      typeof o.date === "string" && o.date.trim()
        ? o.date
        : new Date().toISOString().slice(0, 10),
  };
}

function respond(input: DocInput, format: DocFormat): NextResponse {
  const doc = generateDocument(input);
  const headers = docResponseHeaders(doc, format);
  return new NextResponse(doc.html, { status: 200, headers });
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
    }

    const o = (body ?? {}) as Record<string, unknown>;
    // Accept either { input: {...} } or a bare DocInput as the body.
    const rawInput = o.input ?? o;
    const input = coerceInput(rawInput);
    if (!input) {
      return NextResponse.json(
        { error: "missing or invalid 'input': require { type, company }" },
        { status: 400 }
      );
    }

    const format = normalizeFormat(o.format);
    return respond(input, format);
  } catch (err) {
    console.error("[documents] POST /api/documents/generate failed:", err);
    return NextResponse.json(
      { error: "failed to generate document" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type") ?? "proposal";
    const company = sp.get("company") ?? "";

    const input = coerceInput({
      type,
      company: company || "Sample Company",
      clientName: sp.get("clientName") ?? undefined,
      senderCompany: sp.get("senderCompany") ?? undefined,
      senderName: sp.get("senderName") ?? undefined,
      notes: sp.get("notes") ?? undefined,
      validityDays: sp.get("validityDays")
        ? Number(sp.get("validityDays"))
        : undefined,
      // A tiny sample line item so the quick-test output is non-empty.
      services: [
        { name: "Sample Service", price: 25000, description: "Demonstration line item." },
      ],
    });

    if (!input) {
      return NextResponse.json(
        { error: "invalid 'type': one of " + DOC_TYPES.join(", ") },
        { status: 400 }
      );
    }

    const format = normalizeFormat(sp.get("format"));
    return respond(input, format);
  } catch (err) {
    console.error("[documents] GET /api/documents/generate failed:", err);
    return NextResponse.json(
      { error: "failed to generate document" },
      { status: 500 }
    );
  }
}
