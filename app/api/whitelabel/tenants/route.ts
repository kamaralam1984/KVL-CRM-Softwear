/* ══════════════════════════════════════════════════════════
   WHITE LABEL — Tenants API (Phase 13)
   The canonical store is localStorage (client-side). This route
   provides server-side validation/normalization of tenant objects
   passed in the request body. It does NOT persist server-side.
══════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Tenant } from "@/lib/whitelabel/types";

export const dynamic = "force-dynamic";

/** Optional bearer guard — only enforced when a secret is configured. */
function authorized(req: NextRequest): boolean {
  const secret = process.env.WHITELABEL_API_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Validate + normalize a raw tenant payload. Returns null when invalid. */
function normalizeTenant(raw: unknown): Tenant | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const brandName = typeof r.brandName === "string" ? r.brandName.trim() : "";
  const rawSlug = typeof r.slug === "string" ? r.slug.trim() : "";
  const slug = slugify(rawSlug || brandName);

  if (!brandName || !slug) return null;

  const now = new Date().toISOString();
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  const tenant: Tenant = {
    id: str(r.id) || slug,
    slug,
    brandName,
    tagline: str(r.tagline),
    logoUrl: str(r.logoUrl),
    primaryColor: str(r.primaryColor),
    domain: str(r.domain),
    supportEmail: str(r.supportEmail),
    plan: str(r.plan),
    active: r.active === undefined ? true : Boolean(r.active),
    createdAt: str(r.createdAt) || now,
  };

  if (r.smtp && typeof r.smtp === "object") {
    const s = r.smtp as Record<string, unknown>;
    tenant.smtp = {
      host: str(s.host) || "",
      port: Number(s.port) || 0,
      user: str(s.user) || "",
      fromEmail: str(s.fromEmail) || "",
    };
  }

  if (r.whatsapp && typeof r.whatsapp === "object") {
    const w = r.whatsapp as Record<string, unknown>;
    tenant.whatsapp = {
      provider: str(w.provider) || "",
      from: str(w.from) || "",
    };
  }

  return tenant;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    tenants: [],
    notes:
      "Tenants are stored client-side in localStorage under key 'crm_tenants'. " +
      "Read them via lib/whitelabel/store.getTenants(). POST here to validate/normalize a tenant.",
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[whitelabel] invalid JSON body", err);
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const tenant = normalizeTenant(body);
  if (!tenant) {
    return NextResponse.json(
      { error: "missing or invalid brandName/slug" },
      { status: 400 },
    );
  }

  return NextResponse.json({ tenant });
}
