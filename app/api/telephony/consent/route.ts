// Played to the called party when CALL_RECORDING=true (recording consent notice).
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const body = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>This call may be recorded for quality and training purposes.</Say></Response>';
export async function POST() { return new NextResponse(body, { headers: { "Content-Type": "text/xml" } }); }
export async function GET() { return POST(); }
