import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — KVl CRM | Sales, Support & Partnerships",
  description: "Get in touch with the KVl CRM team. Reach our sales team for pricing questions, support team for technical help, or partnerships team for integrations. We respond within 4 hours.",
  keywords: "KVl CRM contact, CRM support, sales CRM help, contact AI CRM, CRM customer support, CRM demo request, CRM partnerships",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
