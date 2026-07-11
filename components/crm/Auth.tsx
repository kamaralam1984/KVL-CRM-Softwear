"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight,
  Check, AlertCircle, Globe, Code, Shield, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";

/* ── Types ───────────────────────────────────────────── */
export interface AuthUser {
  id:     string;
  name:   string;
  email:  string;
  role:   string;
  avatar: string;
}
interface AuthProps {
  onAuth: (user: AuthUser) => void;
  onBack?: () => void;
}

/* ── Demo fallback ───────────────────────────────────── */
const DEMO_ACCOUNTS: Record<string, { id: string; password: string; name: string; role: string }> = {
  "kamaralam137@gmail.com":  { id: "sa", password: "K12345678", name: "Super Admin", role: "Super Admin" },
  "animesh@freedomwithai.com": { id: "1",  password: "demo123",  name: "Animesh",     role: "Admin" },
  "sarah@aicrmpro.com":        { id: "2",  password: "demo123",  name: "Sarah Chen",  role: "Senior AE" },
  "demo@crm.com":              { id: "3",  password: "demo",     name: "Demo User",   role: "Viewer" },
};
function isSupabaseConfigured() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");
}

/* ── Password strength ───────────────────────────────── */
function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++; if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: "Weak",   color: "#D4AF37" };
  if (s <= 3) return { score: s, label: "Medium", color: "#f59e0b" };
  return              { score: s, label: "Strong", color: "#00843D" };
}

/* ── Animated particles ──────────────────────────────── */
function Particles({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = (canvas.width = window.innerWidth), H = (canvas.height = window.innerHeight);
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    const pts = Array.from({ length: 50 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.3,
      col: i % 3 === 0 ? [212, 175, 55] : [0, 132, 61], // violet or green
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${dark ? 0.45 : 0.3})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [dark]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

/* ── Main Component ──────────────────────────────────── */
export default function Auth({ onAuth, onBack }: AuthProps) {
  const [dark,     setDark]     = useState(true);
  const [tab,      setTab]      = useState<"login"|"signup">("login");
  const [showPw,   setShowPw]   = useState(false);
  const [showPw2,  setShowPw2]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [remember, setRemember] = useState(true);
  const [lEmail, setLEmail] = useState("");
  const [lPw,    setLPw]    = useState("");
  const [sName,  setSName]  = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPw,    setSPw]    = useState("");
  const [sPw2,   setSPw2]   = useState("");
  const [agreed, setAgreed] = useState(false);

  const pwStr = passwordStrength(sPw);

  useEffect(() => {
    const saved = localStorage.getItem("kvl_theme");
    if (saved) setDark(saved === "dark");
  }, []);
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("kvl_theme", next ? "dark" : "light");
  };

  // Theme tokens
  const bg       = dark ? "#09090B" : "#F8F6F1";
  const cardBg   = dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)";
  const cardBrd  = dark ? "rgba(212,175,55,0.2)"   : "rgba(212,175,55,0.15)";
  const text1    = dark ? "#ffffff"                : "#0D0D0D";
  const text2    = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const text3    = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const inputBg  = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const inputBrd = dark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.1)";
  const divider  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const redGrad  = "linear-gradient(135deg,#D4AF37,#F5C842)";
  const greenGrad= "linear-gradient(135deg,#006B3C,#00843D)";

  const inputCls = (hasError?: boolean) =>
    `w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none transition-all duration-200 ${hasError ? "border-red-500/50" : ""}`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!lEmail || !lPw) { setError("Please fill in all fields."); return; }
    setLoading(true);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: lEmail.toLowerCase(), password: lPw });
      setLoading(false);
      if (err) { setError(err.message); return; }
      const meta = data.user?.user_metadata ?? {};
      const name = (meta.name as string) || lEmail.split("@")[0];
      const user: AuthUser = { id: data.user?.id ?? "su", name, email: lEmail.toLowerCase(), role: (meta.role as string) || "Member", avatar: name.split(" ").map((w:string) => w[0]).join("").substring(0,2).toUpperCase() };
      if (remember) localStorage.setItem("crm_user", JSON.stringify(user));
      onAuth(user); return;
    }

    await new Promise(r => setTimeout(r, 700));
    if (lPw.length < 4) { setLoading(false); setError("Password must be at least 4 characters."); return; }
    // Known demo accounts keep their role; any other email gets Member access
    const knownAcc = DEMO_ACCOUNTS[lEmail.toLowerCase()];
    const name = knownAcc
      ? knownAcc.name
      : lEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const role = knownAcc ? knownAcc.role : "Member";
    const userId = knownAcc ? knownAcc.id : `u_${lEmail.replace(/[^a-z0-9]/gi, "")}`;
    const user: AuthUser = { id: userId, name, email: lEmail.toLowerCase(), role, avatar: name.split(" ").map((w:string) => w[0]).join("").substring(0,2).toUpperCase() };
    if (remember) localStorage.setItem("crm_user", JSON.stringify(user));
    setLoading(false);
    onAuth(user);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!sName.trim()) { setError("Full name is required."); return; }
    if (!sEmail.includes("@")) { setError("Enter a valid email address."); return; }
    if (sPw.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (sPw !== sPw2) { setError("Passwords do not match."); return; }
    if (!agreed) { setError("Please accept the terms to continue."); return; }
    setLoading(true);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error: err } = await supabase.auth.signUp({ email: sEmail.toLowerCase(), password: sPw, options: { data: { name: sName.trim(), role: "Member" } } });
      setLoading(false);
      if (err) { setError(err.message); return; }
      if (data.user && !data.session) { setError("Check your email to confirm your account, then sign in."); return; }
      const user: AuthUser = { id: data.user?.id ?? `u_${Date.now()}`, name: sName.trim(), email: sEmail.toLowerCase(), role: "Member", avatar: sName.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase() };
      localStorage.setItem("crm_user", JSON.stringify(user));
      onAuth(user); return;
    }

    await new Promise(r => setTimeout(r, 800));
    const user: AuthUser = { id: `u_${sEmail.replace(/[^a-z0-9]/gi,"")}`, name: sName.trim(), email: sEmail.toLowerCase(), role: "Member", avatar: sName.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase() };
    localStorage.setItem("crm_user", JSON.stringify(user));
    setLoading(false);
    onAuth(user);
  };

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center overflow-hidden transition-colors duration-300"
      style={{ background: bg }}>
      <Particles dark={dark} />

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale:[1,1.2,1], opacity:[0.12,0.2,0.12] }} transition={{ duration:8, repeat:Infinity }}
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background:"radial-gradient(circle,#D4AF37,transparent 70%)" }} />
        <motion.div animate={{ scale:[1,1.15,1], opacity:[0.1,0.18,0.1] }} transition={{ duration:10, repeat:Infinity, delay:2 }}
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background:"radial-gradient(circle,#00843D,transparent 70%)" }} />
        <div className="absolute inset-0" style={{ opacity: dark ? 0.025 : 0.04,
          backgroundImage:`linear-gradient(${dark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.2)"} 1px,transparent 1px),linear-gradient(90deg,${dark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.2)"} 1px,transparent 1px)`,
          backgroundSize:"50px 50px" }} />
      </div>

      {/* Theme toggle */}
      <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
        onClick={toggleDark}
        className="absolute top-5 right-5 z-20 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}>
        {dark ? <Sun size={16} style={{ color:"#D4AF37" }} /> : <Moon size={16} style={{ color:"rgba(0,0,0,0.4)" }} />}
      </motion.button>

      <div className="relative z-10 w-full max-w-md px-4">

        {/* Back button */}
        {onBack && (
          <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs mb-6 transition-colors"
            style={{ color: text2 }}
            onMouseEnter={e => (e.currentTarget.style.color = text1)}
            onMouseLeave={e => (e.currentTarget.style.color = text2)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to homepage
          </motion.button>
        )}

        {/* Logo */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <motion.div whileHover={{ rotate:10, scale:1.1 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-2xl"
              style={{ background: greenGrad, boxShadow:"0 8px 32px rgba(0,132,61,0.4)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </motion.div>
            <motion.span animate={{ scale:[1,1.3,1] }} transition={{ duration:2, repeat:Infinity }}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2"
              style={{ borderColor: bg }} />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: text1 }}>KVl CRM</h1>
          <p className="text-sm mt-1" style={{ color: text2 }}>Premium Sales Intelligence Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: cardBg, border:`1px solid ${cardBrd}`, boxShadow: dark ? "0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.06)" : "0 24px 60px rgba(0,0,0,0.12)", backdropFilter:"blur(20px)" }}>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom:`1px solid ${divider}` }}>
            {(["login","signup"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className="flex-1 py-4 text-sm font-bold transition-all"
                style={{
                  color: tab===t ? "#D4AF37" : text2,
                  borderBottom: tab===t ? "2px solid #D4AF37" : "2px solid transparent",
                  background: tab===t ? "rgba(212,175,55,0.05)" : "transparent",
                }}>
                {t==="login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="p-7">
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} className="overflow-hidden mb-4">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", color:"#F5C842" }}>
                    <AlertCircle size={13} className="flex-shrink-0" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">

              {/* LOGIN */}
              {tab==="login" && (
                <motion.form key="login" initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:16 }} transition={{ duration:0.2 }}
                  onSubmit={handleLogin} className="space-y-4">

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: text2 }}>Email Address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: text2 }} />
                      <input type="email" placeholder="you@company.com" value={lEmail}
                        onChange={e => { setLEmail(e.target.value); setError(""); }}
                        className={inputCls(!!error)}
                        style={{ background: inputBg, border:`1px solid ${error ? "rgba(212,175,55,0.4)" : inputBrd}`, color: text1 }}
                        onFocus={e => (e.target.style.borderColor = "#D4AF37")}
                        onBlur={e => (e.target.style.borderColor = error ? "rgba(212,175,55,0.4)" : inputBrd)}
                        autoComplete="email" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: text2 }}>Password</label>
                      <button type="button" className="text-[11px] font-semibold transition-colors" style={{ color:"#D4AF37" }}>Forgot password?</button>
                    </div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: text2 }} />
                      <input type={showPw ? "text" : "password"} placeholder="Enter your password" value={lPw}
                        onChange={e => { setLPw(e.target.value); setError(""); }}
                        className={inputCls(!!error)}
                        style={{ background: inputBg, border:`1px solid ${error ? "rgba(212,175,55,0.4)" : inputBrd}`, color: text1, paddingRight:"2.5rem" }}
                        onFocus={e => (e.target.style.borderColor = "#D4AF37")}
                        onBlur={e => (e.target.style.borderColor = error ? "rgba(212,175,55,0.4)" : inputBrd)}
                        autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: text2 }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setRemember(p => !p)}
                      className="flex items-center gap-2 text-xs transition-colors" style={{ color: text2 }}>
                      <div className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                        style={{ background: remember ? "#D4AF37" : "transparent", borderColor: remember ? "#D4AF37" : inputBrd }}>
                        {remember && <Check size={9} className="text-white" />}
                      </div>
                      Remember me
                    </button>
                    <div className="flex items-center gap-1.5">
                      {[
                        { label:"Admin",  email:"animesh@freedomwithai.com", pw:"demo123", bg:"rgba(212,175,55,0.1)",  brd:"rgba(212,175,55,0.3)",  col:"#D4AF37" },
                        { label:"Sales",  email:"sarah@aicrmpro.com",        pw:"demo123", bg:"rgba(0,132,61,0.1)",   brd:"rgba(0,132,61,0.3)",   col:"#00843D" },
                        { label:"Viewer", email:"demo@crm.com",              pw:"demo",    bg:"rgba(128,128,128,0.1)",brd:"rgba(128,128,128,0.2)", col: text2 },
                      ].map(d => (
                        <button key={d.label} type="button"
                          onClick={() => { setLEmail(d.email); setLPw(d.pw); setError(""); }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all"
                          style={{ background: d.bg, borderColor: d.brd, color: d.col }}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.button type="submit" disabled={loading}
                    whileHover={{ scale:1.02, boxShadow:"0 0 30px rgba(212,175,55,0.5)" }} whileTap={{ scale:0.98 }}
                    className="w-full py-3 rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 mt-2 disabled:opacity-60 transition-all"
                    style={{ background: redGrad, boxShadow:"0 4px 20px rgba(212,175,55,0.35)" }}>
                    {loading
                      ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : <><ArrowRight size={16} /> Sign In to Dashboard</>}
                  </motion.button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px" style={{ background: divider }} />
                    <span className="text-[11px]" style={{ color: text3 }}>or continue with</span>
                    <div className="flex-1 h-px" style={{ background: divider }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[["Google", Globe], ["GitHub", Code]].map(([label, Icon]) => {
                      const I = Icon as React.ElementType;
                      return (
                        <button key={label as string} type="button"
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all"
                          style={{ background: inputBg, borderColor: inputBrd, color: text2 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D4AF37"; (e.currentTarget as HTMLElement).style.color = text1; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = inputBrd; (e.currentTarget as HTMLElement).style.color = text2; }}>
                          <I size={14} /> {label as string}
                        </button>
                      );
                    })}
                  </div>
                </motion.form>
              )}

              {/* SIGNUP */}
              {tab==="signup" && (
                <motion.form key="signup" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.2 }}
                  onSubmit={handleSignup} className="space-y-4">

                  {/* Name */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: text2 }}>Full Name</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: text2 }} />
                      <input type="text" placeholder="John Smith" value={sName}
                        onChange={e => { setSName(e.target.value); setError(""); }}
                        className={inputCls()}
                        style={{ background: inputBg, border:`1px solid ${inputBrd}`, color: text1 }}
                        onFocus={e => (e.target.style.borderColor = "#D4AF37")}
                        onBlur={e => (e.target.style.borderColor = inputBrd)}
                        autoComplete="name" />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: text2 }}>Email Address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: text2 }} />
                      <input type="email" placeholder="you@company.com" value={sEmail}
                        onChange={e => { setSEmail(e.target.value); setError(""); }}
                        className={inputCls()}
                        style={{ background: inputBg, border:`1px solid ${inputBrd}`, color: text1 }}
                        onFocus={e => (e.target.style.borderColor = "#D4AF37")}
                        onBlur={e => (e.target.style.borderColor = inputBrd)}
                        autoComplete="email" />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: text2 }}>Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: text2 }} />
                      <input type={showPw ? "text" : "password"} placeholder="Min. 6 characters" value={sPw}
                        onChange={e => { setSPw(e.target.value); setError(""); }}
                        className={inputCls()}
                        style={{ background: inputBg, border:`1px solid ${inputBrd}`, color: text1, paddingRight:"2.5rem" }}
                        onFocus={e => (e.target.style.borderColor = "#D4AF37")}
                        onBlur={e => (e.target.style.borderColor = inputBrd)}
                        autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: text2 }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {sPw.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= pwStr.score ? pwStr.color : inputBrd }} />
                          ))}
                        </div>
                        <p className="text-[10px] font-bold" style={{ color: pwStr.color }}>{pwStr.label} password</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: text2 }}>Confirm Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: text2 }} />
                      <input type={showPw2 ? "text" : "password"} placeholder="Repeat password" value={sPw2}
                        onChange={e => { setSPw2(e.target.value); setError(""); }}
                        className={inputCls()}
                        style={{ background: inputBg, border:`1px solid ${sPw2.length > 0 ? (sPw===sPw2 ? "rgba(0,132,61,0.5)" : "rgba(212,175,55,0.4)") : inputBrd}`, color: text1, paddingRight:"4rem" }}
                        onFocus={e => (e.target.style.borderColor = "#D4AF37")}
                        onBlur={e => (e.target.style.borderColor = sPw2.length > 0 ? (sPw===sPw2 ? "rgba(0,132,61,0.5)" : "rgba(212,175,55,0.4)") : inputBrd)}
                        autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPw2(p => !p)}
                        className="absolute right-8 top-1/2 -translate-y-1/2" style={{ color: text2 }}>
                        {showPw2 ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {sPw2.length > 0 && sPw===sPw2 && (
                        <Check size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:"#00843D" }} />
                      )}
                    </div>
                  </div>

                  {/* Terms */}
                  <button type="button" onClick={() => setAgreed(p => !p)}
                    className="flex items-start gap-2.5 text-xs w-full text-left transition-colors" style={{ color: text2 }}>
                    <div className="w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 transition-all"
                      style={{ background: agreed ? "#D4AF37" : "transparent", borderColor: agreed ? "#D4AF37" : inputBrd }}>
                      {agreed && <Check size={9} className="text-white" />}
                    </div>
                    <span>I agree to the <span style={{ color:"#D4AF37" }}>Terms of Service</span> and <span style={{ color:"#D4AF37" }}>Privacy Policy</span></span>
                  </button>

                  <motion.button type="submit" disabled={loading}
                    whileHover={{ scale:1.02, boxShadow:"0 0 30px rgba(212,175,55,0.5)" }} whileTap={{ scale:0.98 }}
                    className="w-full py-3 rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 mt-1 disabled:opacity-60 transition-all"
                    style={{ background: redGrad, boxShadow:"0 4px 20px rgba(212,175,55,0.35)" }}>
                    {loading
                      ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : <><ArrowRight size={16} /> Create My Account</>}
                  </motion.button>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[["Google", Globe], ["GitHub", Code]].map(([label, Icon]) => {
                      const I = Icon as React.ElementType;
                      return (
                        <button key={label as string} type="button"
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all"
                          style={{ background: inputBg, borderColor: inputBrd, color: text2 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D4AF37"; (e.currentTarget as HTMLElement).style.color = text1; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = inputBrd; (e.currentTarget as HTMLElement).style.color = text2; }}>
                          <I size={14} /> {label as string}
                        </button>
                      );
                    })}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Demo hint */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
          className="mt-4 px-4 py-3 rounded-xl flex items-start gap-2.5"
          style={{ border:`1px solid ${divider}`, background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
          <Shield size={13} style={{ color:"#00843D" }} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-bold mb-0.5" style={{ color: text2 }}>Open Access</p>
            <p className="text-[11px]" style={{ color: text3 }}>
              Koi bhi email + password (min 4 chars) se login kar sakte hain
            </p>
          </div>
        </motion.div>

        <p className="text-center text-[11px] mt-5" style={{ color: text3 }}>
          © 2026 KVl CRM · FreedomWithAI
        </p>
      </div>
    </div>
  );
}
