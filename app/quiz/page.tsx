import Link from "next/link";
import Quiz from "@/components/marketing/Quiz";

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">← Maxness</Link>
        <div className="flex gap-4">
          <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">30-Second Quiz</span>
          <h1 className="text-4xl md:text-5xl font-black mb-5">
            Which Plan Fits<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Your Team?</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Answer 4 quick questions and we&apos;ll recommend the right plan for you — no signup required.
          </p>
        </div>

        <Quiz />
      </div>

      <footer className="border-t border-white/[0.05] py-8 text-center text-xs text-slate-600 mt-16">
        <div className="flex justify-center gap-6 mb-3">
          {[["Features","/features"],["Pricing","/pricing"],["Privacy Policy","/privacy"],["Terms","/terms"],["Contact","/contact"]].map(([l,h])=>(
            <Link key={l} href={h} className="hover:text-white transition-colors">{l}</Link>
          ))}
        </div>
        © 2025 Maxness · FreedomWithAI. All rights reserved.
      </footer>
    </div>
  );
}
