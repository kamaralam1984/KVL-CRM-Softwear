"use client";
// Phase 31 — SaaS Mode self-serve signup. Reuses Auth.tsx's exact real
// supabase.auth.signUp() call, then creates a tenant + Razorpay subscription
// via lib/actions/tenants.ts::signupTenant. This is the "agencies can sell
// subscriptions with automated sub-account creation" GHL SaaS-mode feature.

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { signupTenant } from "@/lib/actions/tenants";

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("your-project");
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `workspace-${Date.now().toString(36)}`;

export default function SignupPlanPage({ params }: { params: Promise<{ plan: string }> }) {
  const { plan } = use(params);
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!brandName.trim() || !email.includes("@") || password.length < 6) {
      setError("Fill in a workspace name, valid email, and a 6+ character password.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Self-serve signup needs Supabase configured on this deployment.");
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password, options: { data: { name: brandName, role: "Admin" } } });
    if (signUpErr || !data.user) { setLoading(false); setError(signUpErr?.message ?? "Signup failed."); return; }

    const result = await signupTenant({ userId: data.user.id, brandName, slug: slugify(brandName), email, plan });
    setLoading(false);
    if (!result.ok) { setError(result.error ?? "Could not create workspace."); return; }

    if (result.checkoutUrl) {
      setCheckoutUrl(result.checkoutUrl);
    } else {
      router.push("/");
    }
  };

  if (checkoutUrl) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
        <div className="max-w-sm text-center px-6">
          <p className="text-white text-sm mb-4">Workspace created! Complete payment to activate your {plan} plan.</p>
          <a href={checkoutUrl} className="inline-block px-6 py-3 rounded-xl font-bold" style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)", color: "#000" }}>
            Complete Payment
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <form onSubmit={submit} className="w-full max-w-sm px-6 space-y-3">
        <h1 className="text-lg font-black text-white mb-1">Start your {plan} workspace</h1>
        <p className="text-xs text-slate-500 mb-4">14-day free trial, no charge until it ends.</p>
        <input placeholder="Workspace / brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.05] border border-white/10 text-slate-200 outline-none" />
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.05] border border-white/10 text-slate-200 outline-none" />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.05] border border-white/10 text-slate-200 outline-none" />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)", color: "#000" }}>
          {loading ? "Creating workspace…" : "Start Free Trial"}
        </button>
      </form>
    </div>
  );
}
