import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — KVl CRM | How We Protect Your Data",
  description: "Read the KVl CRM Privacy Policy. Learn how we collect, use, store, and protect your personal data. GDPR compliant. Last updated May 2025.",
  keywords: "KVl CRM privacy policy, data protection, GDPR, personal data, CRM data security, privacy rights",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">← KVl CRM</Link>
        <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact Us</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="inline-block text-xs font-semibold text-blue-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10">Legal</span>
          <h1 className="text-4xl font-black mb-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: May 25, 2025 · Effective date: January 1, 2025</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-sm leading-relaxed text-slate-300">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction and Scope</h2>
            <p>KVl CRM ("Company", "we", "us", or "our") is operated by FreedomWithAI and is committed to protecting the privacy and security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our CRM platform, website, mobile application, and related services (collectively, the "Services").</p>
            <p className="mt-3">This policy applies to all users of KVl CRM — including customers, trial users, visitors to our website at aicrmpro.com, and contacts imported by our customers. By using the Services, you agree to the collection and use of information in accordance with this policy.</p>
            <p className="mt-3">If you are located in the European Economic Area (EEA), the United Kingdom, or Switzerland, your personal data is processed in accordance with the General Data Protection Regulation (GDPR). If you are a California resident, please see our additional CCPA disclosures in Section 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold text-slate-200 mb-2">2.1 Information You Provide Directly</h3>
            <p>When you register for an account, we collect your name, email address, company name, phone number, job title, and billing information. When you import contacts into the platform, we store the contact data you upload. When you communicate with us via email, chat, or support tickets, we collect and store the content of those communications.</p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">2.2 Information We Collect Automatically</h3>
            <p>When you use our Services, we automatically collect certain technical information including: IP address, browser type and version, operating system, device identifiers, pages visited, time spent on pages, links clicked, referring URLs, and session duration. This information is collected through cookies, web beacons, and similar tracking technologies as described in our Cookie Policy.</p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">2.3 Information from Third Parties</h3>
            <p>We may receive information about you from third-party services you connect to KVl CRM, such as Google Workspace, Microsoft 365, Stripe for payment processing, and WhatsApp Business API. The information we receive depends on the permissions you grant when connecting these integrations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-slate-200">To provide and improve the Services:</strong> Operating, maintaining, and enhancing KVl CRM features and performance.</li>
              <li><strong className="text-slate-200">Account management:</strong> Creating and managing your account, processing payments, and sending transactional communications.</li>
              <li><strong className="text-slate-200">AI and machine learning:</strong> Training and improving our AI lead scoring, revenue forecasting, and churn detection models using aggregated and anonymized data.</li>
              <li><strong className="text-slate-200">Customer support:</strong> Responding to your questions, resolving disputes, and troubleshooting issues.</li>
              <li><strong className="text-slate-200">Security and fraud prevention:</strong> Detecting, investigating, and preventing fraudulent transactions and unauthorized access.</li>
              <li><strong className="text-slate-200">Legal compliance:</strong> Complying with applicable laws, regulations, and legal processes, including GDPR, CCPA, and financial regulations.</li>
              <li><strong className="text-slate-200">Marketing communications:</strong> Sending promotional emails, product updates, and newsletters (only with your consent, and you may opt out at any time).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Legal Basis for Processing (GDPR)</h2>
            <p>For users in the EEA and UK, we process your personal data under the following legal bases:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-slate-200">Contract performance:</strong> Processing necessary to fulfill our contractual obligations to you (e.g., providing the CRM service you subscribed to).</li>
              <li><strong className="text-slate-200">Legitimate interests:</strong> Processing for our legitimate business interests, such as improving our services, fraud prevention, and direct marketing to existing customers.</li>
              <li><strong className="text-slate-200">Consent:</strong> Where you have given explicit consent, such as for marketing emails or optional cookies.</li>
              <li><strong className="text-slate-200">Legal obligation:</strong> Where we are required to process data to comply with applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal data to third parties. We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-slate-200">Service providers:</strong> Trusted third-party vendors who assist in operating our Services (hosting providers, payment processors, analytics providers, customer support tools), all bound by data processing agreements.</li>
              <li><strong className="text-slate-200">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity with appropriate notice.</li>
              <li><strong className="text-slate-200">Legal requirements:</strong> When required by law, court order, or governmental authority, or when necessary to protect the rights, property, or safety of KVl CRM, its users, or the public.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide Services. You may request deletion of your account and data at any time. Upon account closure, we retain certain data for up to 30 days to allow for data export, after which it is permanently deleted from our systems. Some data may be retained longer where required by law (e.g., financial records for 7 years).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including: AES-256 encryption at rest, TLS 1.3 encryption in transit, multi-factor authentication options, role-based access controls, regular security audits and penetration testing, and SOC 2 Type II compliance. Despite these measures, no internet transmission is 100% secure. We encourage you to use strong passwords and enable two-factor authentication on your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li><strong className="text-slate-200">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-slate-200">Rectification:</strong> Correct inaccurate or incomplete data.</li>
              <li><strong className="text-slate-200">Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong className="text-slate-200">Portability:</strong> Receive your data in a structured, machine-readable format.</li>
              <li><strong className="text-slate-200">Objection:</strong> Object to processing based on legitimate interests.</li>
              <li><strong className="text-slate-200">Restriction:</strong> Request restricted processing in certain circumstances.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <strong className="text-blue-400">privacy@aicrmpro.com</strong>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Cookies and Tracking</h2>
            <p>We use essential cookies for authentication and session management, performance cookies for analytics, and optional marketing cookies for advertising (only with your consent). You can manage cookie preferences at any time through your browser settings or our cookie consent manager.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Children's Privacy</h2>
            <p>KVl CRM is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us immediately and we will take steps to delete such information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. International Data Transfers</h2>
            <p>Your data may be processed in countries other than your own, including the United States. We ensure appropriate safeguards are in place for international transfers, including Standard Contractual Clauses (SCCs) approved by the European Commission for transfers from the EEA.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or prominent notice on our website at least 30 days before the changes take effect. Continued use of the Services after the effective date constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">13. Contact Us</h2>
            <p>For privacy-related questions, data requests, or to reach our Data Protection Officer:</p>
            <div className="mt-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <p><strong className="text-slate-200">KVl CRM — Privacy Team</strong></p>
              <p>Email: privacy@aicrmpro.com</p>
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
