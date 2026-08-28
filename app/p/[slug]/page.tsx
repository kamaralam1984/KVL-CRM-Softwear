// Phase 24 — public render route for pages authored in the KVl Pages builder
// (components/crm/sections/KVlPages.tsx). Server component: fetches the
// published page by slug, records a hit, renders its blocks. 404s (via
// notFound()) for an unknown or unpublished slug rather than a broken page.

import { notFound } from "next/navigation";
import { getPageBySlug, recordPageHit } from "@/lib/actions/pages";
import { BlockRenderer } from "@/components/pages/BlockRenderer";

export const dynamic = "force-dynamic";

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  recordPageHit(slug).catch(() => {});

  return (
    <div className="h-screen overflow-y-auto" style={{ background: "#F8F6F1", color: "#0D0D0D" }}>
      {/* Real page-view attribution — the same tracking SDK every other
          marketing entry point uses (docs/ACQUISITION_ENGINE_ROADMAP.md). */}
      <script src="/kvl-embed.js" data-site-id={page.site_id} async />
      <main className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        {page.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </main>
    </div>
  );
}
