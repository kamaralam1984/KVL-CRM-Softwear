import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — KVl CRM | Transparent Plans for Every Team",
  description: "Simple, transparent pricing for KVl CRM. All plans include 14-day free trial. No credit card required.",
  keywords: "CRM pricing, sales CRM plans, CRM subscription, affordable CRM, enterprise CRM pricing",
  openGraph: {
    title: "KVl CRM Pricing — Start Free, Scale as You Grow",
    description: "Transparent pricing plans for teams of all sizes. Start with a 14-day free trial, no credit card needed.",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
