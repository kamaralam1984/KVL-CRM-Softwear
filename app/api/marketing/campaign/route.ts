// POST /api/marketing/campaign — Marketing Automation engine endpoint.
//
// Body:
//   { "action": "launch", ...campaignFields }   → launch one campaign, returns CampaignResult
//   { "action": "analytics", "campaigns": [...] } → roll CampaignResult[] into portfolio totals
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <MARKETING_CRON_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { launchCampaign, analyzeCampaigns } from "@/lib/marketing";
import type { CampaignResult, LaunchCampaignInput } from "@/lib/marketing/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.MARKETING_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown> | undefined;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid or missing JSON body" },
      { status: 400 },
    );
  }

  const action = body?.action;

  if (action === "launch") {
    const { action: _ignored, ...input } = body;
    if (typeof input.name !== "string" || typeof input.channel !== "string") {
      return NextResponse.json(
        { error: "launch requires 'name' and 'channel'" },
        { status: 400 },
      );
    }
    try {
      const result = await launchCampaign(input as LaunchCampaignInput);
      return NextResponse.json(result);
    } catch (err) {
      // launchCampaign never throws, but guard so we always return JSON.
      console.error("[marketing] launch route error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "launch failed" },
        { status: 500 },
      );
    }
  }

  if (action === "analytics") {
    const campaigns = body?.campaigns;
    if (!Array.isArray(campaigns)) {
      return NextResponse.json(
        { error: "analytics requires 'campaigns' array of CampaignResult" },
        { status: 400 },
      );
    }
    try {
      const analysis = analyzeCampaigns(campaigns as CampaignResult[]);
      return NextResponse.json(analysis);
    } catch (err) {
      console.error("[marketing] analytics route error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "analytics failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "unknown action; expected 'launch' or 'analytics'" },
    { status: 400 },
  );
}
