import type { Metadata } from "next";
import AnalyticsTracker from "@/lib/tracking/sdk/AnalyticsTracker";
import ConsentBanner from "@/lib/tracking/sdk/ConsentBanner";
import PushOptIn from "@/components/marketing/PushOptIn";

export const metadata: Metadata = {
  title: "Contact Us — Maxness | Sales, Support & Partnerships",
  description: "Get in touch with the Maxness team. Reach our sales team for pricing questions, support team for technical help, or partnerships team for integrations. We respond within 4 hours.",
  keywords: "Maxness contact, CRM support, sales CRM help, contact AI CRM, CRM customer support, CRM demo request, CRM partnerships",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsTracker />
      {children}
      <ConsentBanner />
      <PushOptIn />
    </>
  );
}
