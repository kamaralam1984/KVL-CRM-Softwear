// Phase 45 — public registration page. Mirrors app/forms/[slug]/page.tsx's
// shape: server component fetches by slug, 404s if missing/unpublished,
// delegates the interactive form to a client component.

import { notFound } from "next/navigation";
import { getWebinarBySlug } from "@/lib/actions/webinars";
import WebinarRegisterForm from "@/components/webinars/WebinarRegisterForm";

export const dynamic = "force-dynamic";

export default async function WebinarRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const webinar = await getWebinarBySlug(slug);
  if (!webinar) notFound();

  return (
    <div className="min-h-screen" style={{ background: "#F8F6F1", color: "#0D0D0D" }}>
      <script src="/kvl-embed.js" data-site-id={webinar.site_id} async />
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-black mb-3">{webinar.title}</h1>
        <p className="text-sm opacity-70 mb-8">{webinar.description}</p>
        {webinar.scheduled_at && (
          <p className="text-xs mb-8 opacity-60">
            {new Date(webinar.scheduled_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
          </p>
        )}
        <WebinarRegisterForm webinarId={webinar.id} slug={webinar.slug} />
      </main>
    </div>
  );
}
