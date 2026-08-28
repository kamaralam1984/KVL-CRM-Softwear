// Phase 43 — public render route for forms/surveys/quizzes authored in the
// new Forms builder (components/crm/sections/Forms.tsx). Mirrors app/p/
// [slug]/page.tsx's shape: server component fetches by slug, 404s for an
// unknown/unpublished one, renders. No hit counter (forms track submissions,
// not page views, via form_submissions — the analytics that matter here).

import { notFound } from "next/navigation";
import { getFormBySlug } from "@/lib/actions/forms";
import FormRenderer from "@/components/forms/FormRenderer";

export const dynamic = "force-dynamic";

export default async function PublicForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);
  if (!form) notFound();

  return (
    <div className="min-h-screen" style={{ background: "#F8F6F1", color: "#0D0D0D" }}>
      <script src="/kvl-embed.js" data-site-id={form.site_id} async />
      <main className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold text-center mb-8">{form.name}</h1>
        <FormRenderer formId={form.id} fields={form.fields} kind={form.kind} />
      </main>
    </div>
  );
}
