// Phase 45 — the webinar room. Mirrors app/p/[slug]/page.tsx's shape:
// server component fetches by slug, 404s if missing/unpublished, delegates
// the interactive room (video/iframe + chat + attendance tracking) to a
// client component.

import { notFound } from "next/navigation";
import { getWebinarBySlug } from "@/lib/actions/webinars";
import WebinarRoomClient from "@/components/webinars/WebinarRoomClient";

export const dynamic = "force-dynamic";

export default async function WebinarRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const webinar = await getWebinarBySlug(slug);
  if (!webinar) notFound();

  return <WebinarRoomClient webinar={webinar} />;
}
