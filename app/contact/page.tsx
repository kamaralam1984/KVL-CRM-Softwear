"use client";
import Link from "next/link";
import { useState } from "react";

const subjects = [
  "General Inquiry",
  "Sales & Pricing",
  "Technical Support",
  "Data Migration Help",
  "Partnership / Integration",
  "Billing & Subscription",
  "Feature Request",
  "Enterprise / Custom Plan",
  "Press & Media",
  "Other",
];

const faqs = [
  {
    q: "What is the typical response time?",
    a: "Our support team responds to all inquiries within 4 business hours. Enterprise plan customers have access to 24/7 phone and live chat support with a 1-hour guaranteed response time.",
  },
  {
    q: "I want a live demo — how do I book one?",
    a: "You can request a personalized demo by filling out the form above and selecting 'Sales & Pricing' as the subject. Our team will schedule a 30-minute screen-share demo tailored to your team's use case and size.",
  },
  {
    q: "My data migration from another CRM is complex — can you help?",
    a: "Yes. Our implementation team handles data migration for Growth and Enterprise customers at no additional cost. This includes cleaning, mapping, and validating your existing contacts, deals, notes, and history from platforms like Salesforce, HubSpot, Pipedrive, or any CSV export.",
  },
  {
    q: "Do you offer a nonprofit or startup discount?",
    a: "We offer 50% off all plans for registered nonprofits and early-stage startups (under 2 years old, under $1M in funding). Mention your eligibility in the contact form and our team will verify and apply the discount.",
  },
  {
    q: "Can I request a custom feature or API integration?",
    a: "Enterprise customers can request custom integrations and features as part of their dedicated account relationship. For other plans, our product team reviews all feature requests submitted via this form and considers them for future roadmap items.",
  },
  {
    q: "Where are your servers located?",
    a: "KVl CRM infrastructure runs on enterprise cloud providers with data centers in the US, EU, and Asia-Pacific. EU customers can request data residency within the European Union to comply with GDPR requirements.",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">← KVl CRM</Link>
        <div className="flex gap-4">
          <Link href="/features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</Link>
          <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">Get In Touch</span>
          <h1 className="text-4xl md:text-5xl font-black mb-5">
            We Would Love to<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Hear From You</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Whether you are exploring KVl CRM for your team, need help with an existing account, want to discuss a partnership, or have a question about our plans — our team is here to help. We respond to every message within 4 business hours.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-14">
          {[
            {
              icon: "💬",
              title: "Sales & Pricing",
              desc: "Talk to our sales team about plans, pricing, annual contracts, nonprofit discounts, or a personalized product demo.",
              detail: "sales@aicrmpro.com",
              time: "Response within 2 hours",
            },
            {
              icon: "🛠️",
              title: "Technical Support",
              desc: "Get help with data migration, integrations, API access, account issues, or any technical problem you encounter.",
              detail: "support@aicrmpro.com",
              time: "Response within 4 hours",
            },
            {
              icon: "🤝",
              title: "Partnerships",
              desc: "Interested in becoming a reseller, building an integration, or co-marketing? Our partnerships team wants to connect.",
              detail: "partners@aicrmpro.com",
              time: "Response within 1 business day",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="text-3xl mb-4">{c.icon}</div>
              <h2 className="text-base font-bold text-white mb-2">{c.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{c.desc}</p>
              <p className="text-sm text-blue-400 font-medium">{c.detail}</p>
              <p className="text-xs text-slate-500 mt-1">{c.time}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-5 gap-10 mb-20">
          {/* Contact Form */}
          <div className="md:col-span-3">
            <h2 className="text-2xl font-black mb-6">Send Us a Message</h2>

            {submitted ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-white mb-2">Message Received!</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Thank you for reaching out. A member of our team will reply to <strong className="text-white">{form.email}</strong> within 4 business hours. In the meantime, you can explore our <Link href="/features" className="text-blue-400 hover:underline">feature list</Link> or start a <Link href="/" className="text-blue-400 hover:underline">14-day free trial</Link>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="John Smith"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Work Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="john@company.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={form.company}
                    onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Subject *</label>
                  <select
                    required
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Select a subject…</option>
                    {subjects.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Message *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us about your team, your current CRM challenges, or what you are trying to accomplish..."
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send Message →"}
                </button>

                <p className="text-xs text-slate-600 text-center">
                  By submitting this form you agree to our <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>. We never sell your data.
                </p>
              </form>
            )}
          </div>

          {/* Company Info */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-black mb-6">Company Info</h2>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 text-sm text-slate-400">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Company</p>
                  <p className="text-white font-semibold">FreedomWithAI</p>
                  <p>Operating KVl CRM platform</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">General Inquiries</p>
                  <p className="text-blue-400">hello@aicrmpro.com</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Legal & Privacy</p>
                  <p className="text-blue-400">legal@aicrmpro.com</p>
                  <p className="text-blue-400">privacy@aicrmpro.com</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Support Hours</p>
                  <p>Monday – Friday: 9 AM – 8 PM UTC</p>
                  <p>Enterprise: 24/7 available</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Average Response</p>
                  <p className="text-emerald-400 font-semibold">Under 4 business hours</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
              <h3 className="text-sm font-bold text-white mb-2">Want a Live Demo?</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">Book a 30-minute personalized walkthrough with one of our product specialists. We will show you exactly how KVl CRM can work for your specific industry and team size.</p>
              <p className="text-xs text-blue-400 font-medium">Select "Sales & Pricing" in the form →</p>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
              <h3 className="text-sm font-bold text-white mb-2">Enterprise Inquiries</h3>
              <p className="text-xs text-slate-400 leading-relaxed">For teams over 25 users, custom SLAs, white-label options, SSO/SAML, or dedicated infrastructure — contact our enterprise sales team directly at <span className="text-violet-400">enterprise@aicrmpro.com</span>.</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-black text-center mb-10">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {faqs.map(faq => (
              <div key={faq.q} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-violet-950/20 p-12 text-center">
          <h2 className="text-2xl font-black mb-3">Not Ready to Talk Yet?</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">Start a 14-day free trial and explore all features of KVl CRM on your own — no credit card required, no commitment.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold hover:opacity-90 transition-opacity text-sm">
            Start Free Trial →
          </Link>
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
