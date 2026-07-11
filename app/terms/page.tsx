import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — KVl CRM | User Agreement",
  description: "Read the KVl CRM Terms of Service. Understand your rights, responsibilities, and our obligations when using our CRM platform. Last updated May 2025.",
  keywords: "KVl CRM terms of service, user agreement, terms and conditions, CRM legal terms, software license agreement",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">← KVl CRM</Link>
        <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact Us</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="inline-block text-xs font-semibold text-violet-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/10">Legal</span>
          <h1 className="text-4xl font-black mb-3">Terms of Service</h1>
          <p className="text-slate-500 text-sm">Last updated: May 25, 2025 · Effective date: January 1, 2025</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Agreement to Terms</h2>
            <p>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "Customer", or "you") and FreedomWithAI ("Company", "KVl CRM", "we", or "us") governing your access to and use of the KVl CRM platform, website, APIs, and all related services (collectively, the "Services").</p>
            <p className="mt-3">By creating an account, clicking "I Agree," or otherwise accessing the Services, you confirm that you have read, understood, and agree to be bound by these Terms and our <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>. If you do not agree, you must not use the Services.</p>
            <p className="mt-3">If you are using the Services on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms, and "you" refers collectively to you and that entity.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Eligibility</h2>
            <p>To use KVl CRM, you must be at least 18 years old and capable of forming a legally binding contract. The Services are intended for business use and are not designed for personal, family, or household purposes. Users must provide accurate, current, and complete information during registration and keep their account information updated.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Account Registration and Security</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other breach of security. KVl CRM cannot and will not be liable for any loss or damage arising from your failure to protect your login credentials.</p>
            <p className="mt-3">You may not share your account with others or create multiple accounts for the purpose of circumventing plan limits. Each user must have their own account. You are responsible for ensuring that all users added to your workspace comply with these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Subscription Plans and Payment</h2>
            <h3 className="text-base font-semibold text-slate-200 mb-2">4.1 Free Trial</h3>
            <p>KVl CRM offers a 14-day free trial for new customers. No credit card is required for the trial. At the end of the trial period, you must subscribe to a paid plan to continue using the Services. Trial accounts that are not upgraded will be automatically paused, and data will be retained for 30 days before deletion.</p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">4.2 Subscription Billing</h3>
            <p>Paid subscriptions are billed in advance on a monthly or annual basis. By providing a payment method, you authorize us to charge the applicable subscription fees. All fees are non-refundable except as required by applicable law or as expressly stated in our refund policy. We will provide at least 30 days' notice before any price changes take effect for existing subscribers.</p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">4.3 Overdue Payments</h3>
            <p>If payment is overdue by more than 15 days, we reserve the right to suspend access to the Services. We will notify you before suspension. Access will be restored upon receipt of full payment of all outstanding amounts.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Acceptable Use Policy</h2>
            <p>You agree to use KVl CRM only for lawful purposes and in accordance with these Terms. You specifically agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Use the Services to send spam, unsolicited communications, or bulk messages to contacts who have not consented to receive them.</li>
              <li>Upload, transmit, or store any data that violates any applicable law or third-party rights, including intellectual property rights or privacy rights.</li>
              <li>Attempt to gain unauthorized access to the Services, other accounts, or computer systems connected to the Services.</li>
              <li>Use automated scripts, bots, or tools to scrape, extract, or overload our servers without written permission.</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Services.</li>
              <li>Use the Services to engage in any activity that is fraudulent, deceptive, or harmful to KVl CRM or its users.</li>
              <li>Resell, sublicense, or otherwise transfer access to the Services to third parties without our written consent.</li>
              <li>Violate any applicable laws including data protection laws (GDPR, CCPA) when processing contact data in the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Customer Data and Intellectual Property</h2>
            <h3 className="text-base font-semibold text-slate-200 mb-2">6.1 Your Data</h3>
            <p>You retain all ownership rights to the data you upload, import, or create within KVl CRM ("Customer Data"). We do not claim ownership over your Customer Data. You grant us a limited, non-exclusive license to process your Customer Data solely for the purpose of providing the Services to you.</p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">6.2 Our Intellectual Property</h3>
            <p>KVl CRM, including its software, code, design, trademarks, logos, and all associated intellectual property, is owned by FreedomWithAI and is protected by copyright, trademark, and other intellectual property laws. These Terms do not grant you any right to use our intellectual property beyond what is necessary to use the Services.</p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">6.3 Feedback</h3>
            <p>If you provide feedback, suggestions, or ideas about the Services, you grant us an unrestricted, perpetual, royalty-free license to use that feedback for any purpose without any obligation to you.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Data Processing and GDPR</h2>
            <p>To the extent that you use KVl CRM to process personal data of individuals in the EEA or UK, you act as the "data controller" and KVl CRM acts as the "data processor" under GDPR. Our Data Processing Agreement (DPA), which is incorporated into these Terms, governs the processing of personal data on your behalf. You are responsible for ensuring you have a valid legal basis for processing any personal data you upload to the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Service Availability and SLA</h2>
            <p>We strive to maintain 99.9% uptime for the Services, excluding scheduled maintenance windows (which will be communicated 48 hours in advance) and events beyond our reasonable control (force majeure). We do not guarantee uninterrupted access to the Services. Enterprise plan customers receive a formal SLA with service credits for downtime exceeding agreed thresholds.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by applicable law, KVl CRM and FreedomWithAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, loss of data, loss of goodwill, or business interruption, arising from your use of or inability to use the Services.</p>
            <p className="mt-3">Our total aggregate liability for all claims arising out of or relating to these Terms shall not exceed the total fees paid by you in the 12 months preceding the event giving rise to the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Cancellation and Termination</h2>
            <p>You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. Upon cancellation, you will retain access to the Services until the end of the paid period. We may terminate or suspend your account immediately for material violations of these Terms, including non-payment or breach of the Acceptable Use Policy.</p>
            <p className="mt-3">Upon termination, you may export your data within 30 days. After 30 days, your data will be permanently deleted from our systems.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Modifications to Terms</h2>
            <p>We may modify these Terms from time to time. For material changes, we will provide at least 30 days' advance notice via email and prominent in-app notification. Your continued use of the Services after the effective date of the changes constitutes your acceptance of the revised Terms. If you disagree with the changes, you may cancel your subscription before the effective date.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Governing Law and Dispute Resolution</h2>
            <p>These Terms are governed by and construed in accordance with applicable commercial law. Any disputes arising under these Terms shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, disputes may be submitted to binding arbitration. Nothing in this clause prevents either party from seeking injunctive relief in any court of competent jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">13. Contact Information</h2>
            <p>For questions about these Terms of Service, please contact us:</p>
            <div className="mt-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <p><strong className="text-slate-200">KVl CRM — Legal Team</strong></p>
              <p>Email: legal@aicrmpro.com</p>
              <p>Website: <Link href="/contact" className="text-blue-400 hover:underline">Contact Form</Link></p>
              <p>Company: FreedomWithAI, Enterprise Suite</p>
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-white/[0.05] py-8 text-center text-xs text-slate-600">
        <div className="flex justify-center gap-6 mb-3">
          {[["Features","/features"],["Pricing","/pricing"],["Privacy Policy","/privacy"],["Terms","/terms"],["Contact","/contact"]].map(([l,h])=>(
            <Link key={l} href={h} className="hover:text-white transition-colors">{l}</Link>
          ))}
        </div>
        © 2025 KVl CRM · FreedomWithAI. All rights reserved.
      </footer>
    </div>
  );
}
