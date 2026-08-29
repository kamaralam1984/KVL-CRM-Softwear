import type { Metadata } from "next";
import AnalyticsTracker from "@/lib/tracking/sdk/AnalyticsTracker";
import ConsentBanner from "@/lib/tracking/sdk/ConsentBanner";
import PushOptIn from "@/components/marketing/PushOptIn";

export const metadata: Metadata = {
  title: "Which Plan Is Right For You? — Maxness",
  description: "Answer 4 quick questions and get a personalized Maxness plan recommendation in under 30 seconds.",
  keywords: "CRM plan quiz, which CRM plan, Maxness recommendation, CRM calculator",
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsTracker />
      {children}
      <ConsentBanner />
      <PushOptIn />
    </>
  );
}
