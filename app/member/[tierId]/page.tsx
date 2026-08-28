// Phase 29 — gated content viewer for a membership tier's course_content.
// Server component. MVP access check: a `?customer=<id>` query param stands
// in for a real customer-login session — this codebase has no customer-
// facing auth system yet (only staff auth via components/crm/Auth.tsx), and
// building one is out of this phase's scope. Honest about the gap rather
// than faking a real session check: an unauthenticated visitor sees the
// tier's price/description and a "Subscribe" prompt, never the gated content.

import { getMembershipTiers } from "@/lib/actions/membership";
import { getActiveMembershipForCustomer, getCourseContentForTier } from "@/lib/actions/membership";
import SubscribeForm from "@/components/member/SubscribeForm";

export const dynamic = "force-dynamic";

export default async function MemberTierPage({
  params,
  searchParams,
}: {
  params: Promise<{ tierId: string }>;
  searchParams: Promise<{ customer?: string }>;
}) {
  const { tierId } = await params;
  const { customer } = await searchParams;

  const tiers = await getMembershipTiers();
  const tier = tiers.find((t) => t.id === tierId);
  if (!tier) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#F8F6F1" }}>
        <p className="text-sm text-slate-600">Membership tier not found.</p>
      </div>
    );
  }

  const customerId = customer ? Number(customer) : null;
  const membership = customerId ? await getActiveMembershipForCustomer(customerId) : null;
  const hasAccess = membership?.tierId === tierId;

  const content = hasAccess ? await getCourseContentForTier(tierId) : [];

  return (
    <div className="h-screen overflow-y-auto" style={{ background: "#F8F6F1", color: "#0D0D0D" }}>
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-black mb-2">{tier.name}</h1>
        <p className="text-sm opacity-60 mb-8">
          {tier.billing_interval === "one_time" ? `₹${tier.price} one-time` : `₹${tier.price}/${tier.billing_interval === "yearly" ? "year" : "month"}`}
        </p>

        {!hasAccess ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
            <p className="text-sm mb-4">Subscribe to {tier.name} to unlock this content.</p>
            <SubscribeForm tierId={tier.id} />
          </div>
        ) : content.length === 0 ? (
          <p className="text-sm opacity-60">No content published yet for this tier.</p>
        ) : (
          <div className="space-y-4">
            {content.map((item) => (
              <div key={item.id} className="rounded-xl p-4" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
                <p className="text-sm font-bold mb-1">{item.title}</p>
                <p className="text-xs opacity-50 mb-2 uppercase">{item.content_type}{item.drip_day > 0 ? ` · unlocks day ${item.drip_day}` : ""}</p>
                {item.content_url && (
                  <a href={item.content_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: "#0B6E4F" }}>
                    Open →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
