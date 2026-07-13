// Channel publishers. Each tries a real provider when its env keys are set,
// otherwise logs (mock) and returns a fake externalId so the flow runs today.
// None of these ever throw — on any failure they fall back to a mock result.

import type { Campaign, MarketingChannel, PublishResult } from "./types";

// Deterministic fake id so the same campaign always maps to the same mock id.
function mockId(prefix: string, campaign: Campaign): string {
  let h = 0;
  for (const ch of campaign.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${prefix}_mock_${h.toString(36)}`;
}

// --- META (Facebook / Instagram) -----------------------------------------
// Both surfaces publish through the Meta Marketing API with one access token.
async function publishMeta(
  campaign: Campaign,
  surface: "facebook" | "instagram",
): Promise<PublishResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID; // e.g. "act_123456789"

  if (token && accountId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${accountId}/campaigns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: campaign.name,
            objective: "OUTCOME_TRAFFIC",
            status: campaign.status === "active" ? "ACTIVE" : "PAUSED",
            special_ad_categories: [],
            access_token: token,
          }),
        },
      );
      if (res.ok) {
        const j = (await res.json()) as { id?: string };
        return { externalId: j.id, usedRealProvider: true };
      }
      console.error(`[marketing] meta:${surface} publish HTTP ${res.status}`);
    } catch (e) {
      console.error(`[marketing] meta:${surface} publish error:`, e);
    }
  }

  console.log(`[marketing:${surface}:mock] campaign "${campaign.name}" published`);
  return { externalId: mockId(surface, campaign), usedRealProvider: false };
}

export function publishFacebook(campaign: Campaign): Promise<PublishResult> {
  return publishMeta(campaign, "facebook");
}

export function publishInstagram(campaign: Campaign): Promise<PublishResult> {
  return publishMeta(campaign, "instagram");
}

// --- LINKEDIN -------------------------------------------------------------
export async function publishLinkedin(campaign: Campaign): Promise<PublishResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const account = process.env.LINKEDIN_AD_ACCOUNT_ID;

  if (token && account) {
    try {
      const res = await fetch(
        "https://api.linkedin.com/rest/adCampaignsV2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202401",
          },
          body: JSON.stringify({
            account: `urn:li:sponsoredAccount:${account}`,
            name: campaign.name,
            status: campaign.status === "active" ? "ACTIVE" : "DRAFT",
          }),
        },
      );
      if (res.ok) {
        const id = res.headers.get("x-linkedin-id") ?? undefined;
        return { externalId: id, usedRealProvider: true };
      }
      console.error(`[marketing] linkedin publish HTTP ${res.status}`);
    } catch (e) {
      console.error("[marketing] linkedin publish error:", e);
    }
  }

  console.log(`[marketing:linkedin:mock] campaign "${campaign.name}" published`);
  return { externalId: mockId("linkedin", campaign), usedRealProvider: false };
}

// --- GOOGLE ADS -----------------------------------------------------------
export async function publishGoogleAds(campaign: Campaign): Promise<PublishResult> {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (devToken && accessToken && customerId) {
    try {
      const res = await fetch(
        `https://googleads.googleapis.com/v16/customers/${customerId}/campaigns:mutate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": devToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operations: [
              {
                create: {
                  name: campaign.name,
                  status: campaign.status === "active" ? "ENABLED" : "PAUSED",
                  advertisingChannelType: "SEARCH",
                },
              },
            ],
          }),
        },
      );
      if (res.ok) {
        const j = (await res.json()) as {
          results?: { resourceName?: string }[];
        };
        return {
          externalId: j.results?.[0]?.resourceName,
          usedRealProvider: true,
        };
      }
      console.error(`[marketing] google_ads publish HTTP ${res.status}`);
    } catch (e) {
      console.error("[marketing] google_ads publish error:", e);
    }
  }

  console.log(`[marketing:google_ads:mock] campaign "${campaign.name}" published`);
  return { externalId: mockId("gads", campaign), usedRealProvider: false };
}

// --- EMAIL (Resend broadcast) --------------------------------------------
export async function publishEmail(campaign: Campaign): Promise<PublishResult> {
  const key = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const from = process.env.OUTREACH_FROM_EMAIL ?? process.env.MARKETING_FROM_EMAIL;

  if (key && audienceId && from) {
    try {
      const res = await fetch("https://api.resend.com/broadcasts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audience_id: audienceId,
          from,
          subject: campaign.name,
          html: campaign.message ?? campaign.name,
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { id?: string };
        return { externalId: j.id, usedRealProvider: true };
      }
      console.error(`[marketing] email publish HTTP ${res.status}`);
    } catch (e) {
      console.error("[marketing] email publish error:", e);
    }
  }

  console.log(`[marketing:email:mock] campaign "${campaign.name}" queued`);
  return { externalId: mockId("email", campaign), usedRealProvider: false };
}

// --- WHATSAPP (Twilio) ----------------------------------------------------
export async function publishWhatsapp(campaign: Campaign): Promise<PublishResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO ?? campaign.audience;

  if (sid && token && from && to) {
    try {
      const body = new URLSearchParams({
        From: from,
        To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
        Body: campaign.message ?? campaign.name,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        },
      );
      if (res.ok) {
        const j = (await res.json()) as { sid?: string };
        return { externalId: j.sid, usedRealProvider: true };
      }
      console.error(`[marketing] whatsapp publish HTTP ${res.status}`);
    } catch (e) {
      console.error("[marketing] whatsapp publish error:", e);
    }
  }

  console.log(`[marketing:whatsapp:mock] campaign "${campaign.name}" sent`);
  return { externalId: mockId("wa", campaign), usedRealProvider: false };
}

// Map of channel → publisher, so callers can dispatch by campaign.channel.
export const CHANNEL_PUBLISHERS: Record<
  MarketingChannel,
  (campaign: Campaign) => Promise<PublishResult>
> = {
  facebook: publishFacebook,
  instagram: publishInstagram,
  linkedin: publishLinkedin,
  google_ads: publishGoogleAds,
  email: publishEmail,
  whatsapp: publishWhatsapp,
};
