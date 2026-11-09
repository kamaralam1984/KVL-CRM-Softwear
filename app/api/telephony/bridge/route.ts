// TwiML for click-to-call: after the agent answers, dial the lead. Twilio-signature verified
// (the signed URL includes ?to=, so the destination can't be tampered with).
import { NextRequest, NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/messaging/twilioSignature";

export const dynamic = "force-dynamic";
const xml = (s: string) => new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${s}</Response>`, { headers: { "Content-Type": "text/xml" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(req: NextRequest) {
  const params = Object.fromEntries(new URLSearchParams(await req.text()));
  if (!process.env.TWILIO_AUTH_TOKEN || !verifyTwilioSignature(req.nextUrl.toString(), params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const q = req.nextUrl.searchParams;
  const to = (q.get("to") ?? "").replace(/[^\d+]/g, "");
  const log = q.get("log") ?? "";
  const app = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!to) return xml("<Say>No destination number.</Say>");

  const record = process.env.CALL_RECORDING === "true";
  const cb = `${app}/api/telephony/call-status?log=${esc(log)}`;
  const dialAttrs = [`callerId="${esc(process.env.TWILIO_FROM_NUMBER ?? "")}"`, `answerOnBridge="true"`,
    record ? `record="record-from-answer-dual" recordingStatusCallback="${cb}"` : ""].filter(Boolean).join(" ");
  // The <Number url> is fetched when the LEAD answers → they hear the recording notice (consent).
  const number = record ? `<Number url="${esc(`${app}/api/telephony/consent`)}">${esc(to)}</Number>` : `<Number>${esc(to)}</Number>`;
  return xml(`<Say>Connecting you to ${esc(q.get("name") ?? "your lead")}.</Say><Dial ${dialAttrs}>${number}</Dial>`);
}
