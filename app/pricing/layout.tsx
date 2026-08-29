import type { Metadata } from "next";
import AnalyticsTracker from "@/lib/tracking/sdk/AnalyticsTracker";
import ConsentBanner from "@/lib/tracking/sdk/ConsentBanner";
import PushOptIn from "@/components/marketing/PushOptIn";

export const metadata: Metadata = {
  title: "Pricing — Maxness | Transparent Plans for Every Team",
  description: "Simple, transparent pricing for Maxness. All plans include 14-day free trial. No credit card required.",
  keywords: "CRM pricing, sales CRM plans, CRM subscription, affordable CRM, enterprise CRM pricing",
  openGraph: {
    title: "Maxness Pricing — Start Free, Scale as You Grow",
    description: "Transparent pricing plans for teams of all sizes. Start with a 14-day free trial, no credit card needed.",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsTracker />
      {children}
      <ConsentBanner />
      <PushOptIn />
    </>
  );
}
