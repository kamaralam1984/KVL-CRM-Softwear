import type { Metadata } from "next";
import AnalyticsTracker from "@/lib/tracking/sdk/AnalyticsTracker";
import ConsentBanner from "@/lib/tracking/sdk/ConsentBanner";
import PushOptIn from "@/components/marketing/PushOptIn";

export const metadata: Metadata = {
  title: "Which Plan Is Right For You? — KVl CRM",
  description: "Answer 4 quick questions and get a personalized KVl CRM plan recommendation in under 30 seconds.",
  keywords: "CRM plan quiz, which CRM plan, KVl CRM recommendation, CRM calculator",
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
