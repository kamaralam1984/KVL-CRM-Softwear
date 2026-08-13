"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Check, Star, Zap, Shield, BarChart3,
  MessageCircle, TrendingUp, ChevronRight,
  Play, X, Menu, Mail, Sun, Moon,
  Target, Rocket, Award, GitBranch, Wallet,
  Users, CheckSquare, UserPlus, UserCheck, Bell,
  MessageSquare, Inbox, Lock, Key, Eye, Server,
  Calendar, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ModuleDetailModal from "@/components/crm/ModuleDetailModal";
import { MODULE_CONTENT, type ModuleContent } from "@/lib/moduleContent";
import AnalyticsTracker from "@/lib/tracking/sdk/AnalyticsTracker";
import ConsentBanner from "@/lib/tracking/sdk/ConsentBanner";
import { kvlAnalytics } from "@/lib/tracking/sdk/client";

/* ══════════════════════════════════════════════
   THEME
══════════════════════════════════════════════ */
function makeTheme(dark: boolean) {
  return dark ? {
    bg:              "#050508",
    navBg:           "rgba(5,5,8,0.96)",
    navBorder:       "rgba(212,175,55,0.12)",
    text1:           "#ffffff",
    text2:           "rgba(255,255,255,0.52)",
    text3:           "rgba(255,255,255,0.22)",
    cardBg:          "rgba(255,255,255,0.025)",
    cardBorder:      "rgba(255,255,255,0.07)",
    cardHoverBg:     "rgba(212,175,55,0.05)",
    cardHoverBorder: "rgba(212,175,55,0.28)",
    divider:         "rgba(212,175,55,0.08)",
    gridCol:         "rgba(212,175,55,0.6)",
    barInactive:     "rgba(212,175,55,0.18)",
    logoText:        "rgba(255,255,255,0.18)",
    badgeBg:         "rgba(212,175,55,0.08)",
    badgeBorder:     "rgba(212,175,55,0.35)",
    badgeText:       "#D4AF37",
    mockupBg:        "linear-gradient(135deg,#0d1117,#080c14)",
    mockupBorder:    "rgba(212,175,55,0.15)",
    mockupCardBg:    "rgba(255,255,255,0.02)",
    mockupCardBrd:   "rgba(255,255,255,0.05)",
    mockupText:      "rgba(255,255,255,0.32)",
    urlBarBg:        "rgba(255,255,255,0.03)",
    urlBarBorder:    "rgba(255,255,255,0.06)",
    urlText:         "rgba(255,255,255,0.28)",
    ctaSecBg:        "rgba(255,255,255,0.04)",
    ctaSecBorder:    "rgba(255,255,255,0.10)",
    ctaSecText:      "rgba(255,255,255,0.75)",
    playBg:          "rgba(212,175,55,0.15)",
    playBorder:      "rgba(212,175,55,0.3)",
    toggleBg:        "rgba(255,255,255,0.06)",
    toggleIcon:      "rgba(255,255,255,0.5)",
    switchOff:       "rgba(255,255,255,0.1)",
    pricingCardBg:   "rgba(255,255,255,0.02)",
    pricingCardBrd:  "rgba(255,255,255,0.06)",
    pricingPopBg:    "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02))",
    pricingPopShadow:"0 0 60px rgba(212,175,55,0.08)",
    footerBg:        "#050508",
    modalBg:         "linear-gradient(135deg,#0d1117,#080c14)",
    modalBorder:     "rgba(212,175,55,0.2)",
    closeBg:         "rgba(255,255,255,0.06)",
    closeIcon:       "rgba(255,255,255,0.5)",
    particleCol:     (a: number) => `rgba(212,175,55,${a * 0.8})`,
    orb1:            "radial-gradient(circle,#D4AF37,transparent 70%)",
    orb2:            "radial-gradient(circle,#8B7536,transparent 70%)",
    ctaBoxBg:        "linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.01))",
    ctaBoxBorder:    "rgba(212,175,55,0.2)",
    statsBg:         "linear-gradient(to right,rgba(212,175,55,0.03),transparent,rgba(212,175,55,0.03))",
    howBg:           "linear-gradient(to bottom,#050508,rgba(212,175,55,0.04),#050508)",
    pricingBg:       "linear-gradient(to bottom,#050508,rgba(212,175,55,0.03),#050508)",
  } : {
    bg:              "#F8F6F1",
    navBg:           "rgba(248,246,241,0.96)",
    navBorder:       "rgba(212,175,55,0.18)",
    text1:           "#0D0D0D",
    text2:           "rgba(0,0,0,0.52)",
    text3:           "rgba(0,0,0,0.28)",
    cardBg:          "rgba(255,255,255,0.85)",
    cardBorder:      "rgba(0,0,0,0.07)",
    cardHoverBg:     "rgba(212,175,55,0.07)",
    cardHoverBorder: "rgba(212,175,55,0.45)",
    divider:         "rgba(0,0,0,0.08)",
    gridCol:         "rgba(0,0,0,0.12)",
    barInactive:     "rgba(212,175,55,0.15)",
    logoText:        "rgba(0,0,0,0.2)",
    badgeBg:         "rgba(212,175,55,0.12)",
    badgeBorder:     "rgba(212,175,55,0.4)",
    badgeText:       "#7A5F00",
    mockupBg:        "linear-gradient(135deg,#ffffff,#F5F3EE)",
    mockupBorder:    "rgba(212,175,55,0.2)",
    mockupCardBg:    "rgba(0,0,0,0.025)",
    mockupCardBrd:   "rgba(0,0,0,0.07)",
    mockupText:      "rgba(0,0,0,0.38)",
    urlBarBg:        "rgba(0,0,0,0.03)",
    urlBarBorder:    "rgba(0,0,0,0.07)",
    urlText:         "rgba(0,0,0,0.35)",
    ctaSecBg:        "rgba(0,0,0,0.04)",
    ctaSecBorder:    "rgba(0,0,0,0.12)",
    ctaSecText:      "rgba(0,0,0,0.7)",
    playBg:          "rgba(212,175,55,0.18)",
    playBorder:      "rgba(212,175,55,0.35)",
    toggleBg:        "rgba(0,0,0,0.06)",
    toggleIcon:      "rgba(0,0,0,0.5)",
    switchOff:       "rgba(0,0,0,0.12)",
    pricingCardBg:   "rgba(255,255,255,0.9)",
    pricingCardBrd:  "rgba(0,0,0,0.08)",
    pricingPopBg:    "linear-gradient(135deg,rgba(212,175,55,0.1),rgba(212,175,55,0.03))",
    pricingPopShadow:"0 0 60px rgba(212,175,55,0.12)",
    footerBg:        "#F0EDE5",
    modalBg:         "linear-gradient(135deg,#ffffff,#F5F3EE)",
    modalBorder:     "rgba(212,175,55,0.25)",
    closeBg:         "rgba(0,0,0,0.06)",
    closeIcon:       "rgba(0,0,0,0.45)",
    particleCol:     (a: number) => `rgba(180,140,20,${a * 0.7})`,
    orb1:            "radial-gradient(circle,rgba(212,175,55,0.5),transparent 70%)",
    orb2:            "radial-gradient(circle,rgba(212,175,55,0.4),transparent 70%)",
    ctaBoxBg:        "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(255,255,255,0.5))",
    ctaBoxBorder:    "rgba(212,175,55,0.25)",
    statsBg:         "linear-gradient(to right,rgba(212,175,55,0.05),rgba(255,255,255,0.5),rgba(212,175,55,0.05))",
    howBg:           "linear-gradient(to bottom,#F8F6F1,rgba(212,175,55,0.06),#F8F6F1)",
    pricingBg:       "linear-gradient(to bottom,#F8F6F1,rgba(212,175,55,0.05),#F8F6F1)",
  };
}

/* ══════════════════════════════════════════════
   PARTICLES
══════════════════════════════════════════════ */
function Particles({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = (canvas.width = window.innerWidth), H = (canvas.height = window.innerHeight);
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.3, a: Math.random() * 0.7 + 0.1,
    }));
    const col = dark
      ? (a: number) => `rgba(212,175,55,${a})`
      : (a: number) => `rgba(180,140,20,${a * 0.6})`;
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = col(p.a * 0.55); ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx*dx+dy*dy);
        if (d < 110) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = col((1-d/110)*0.1); ctx.lineWidth=0.5; ctx.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [dark]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   DATA
══════════════════════════════════════════════ */

const testimonials = [
  { name: "Marcus Williams", role: "CEO, GrowthBridge",         img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&q=80", text: "We tried 6 different platforms over 3 years. Nothing came close. The WhatsApp integration and automation workflows are game-changers for our team of 30+ reps." },
  { name: "Sarah Chen",      role: "VP Sales, TechFlow Inc",    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&q=80", text: "Our pipeline is now 3× larger and we close deals 40% faster. The revenue intelligence alone paid for the subscription in the first week." },
  { name: "Priya Patel",     role: "Head of Revenue, CloudScale",img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&q=80", text: "The churn risk alert caught our biggest account two weeks before we would have noticed. That one insight saved us $180K in annual recurring revenue." },
];

const steps = [
  { num: "01", icon: Rocket, title: "Sign Up in 60 Seconds",    desc: "No credit card needed. Create your workspace, invite your team, and start closing deals immediately.",    img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=240&fit=crop&q=80" },
  { num: "02", icon: Target, title: "Import & Organize",         desc: "Upload contacts, leads, and deals. The platform automatically cleans, scores, and categorizes everything.", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=240&fit=crop&q=80" },
  { num: "03", icon: Award,  title: "Close More, Every Month",   desc: "Surface the hottest opportunities, automate follow-ups, and guide your team to hit targets consistently.", img: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=240&fit=crop&q=80" },
];

const modules = [
  { icon: Users,         title: "Leads",           color: "#3b82f6" },
  { icon: Award,         title: "Customers",       color: "#10b981" },
  { icon: Target,        title: "Deals",           color: "#D4AF37" },
  { icon: GitBranch,     title: "Pipeline",        color: "#8b5cf6" },
  { icon: CheckSquare,   title: "Tasks",           color: "#f59e0b" },
  { icon: Wallet,        title: "Finance",         color: "#00A86B" },
  { icon: BarChart3,     title: "Reports",         color: "#ef4444" },
  { icon: MessageCircle, title: "WhatsApp CRM",    color: "#25D366" },
  { icon: Mail,          title: "Email Marketing", color: "#3b82f6" },
  { icon: Zap,           title: "Automation",      color: "#D4AF37" },
  { icon: TrendingUp,    title: "AI Assistant",    color: "#8b5cf6" },
  { icon: Users,         title: "Team Mgmt",       color: "#06b6d4" },
  { icon: Star,          title: "Smart Insights",  color: "#f59e0b" },
];

const workflowSteps = [
  { icon: UserPlus,      label: "Lead Created",   sub: "Auto-detected",    iconBg:"rgba(59,130,246,0.15)",  iconColor:"#3b82f6",  bg:"rgba(59,130,246,0.06)",   border:"1px solid rgba(59,130,246,0.22)",   shadow:"0 4px 20px rgba(59,130,246,0.1)" },
  { icon: UserCheck,     label: "Assign Owner",   sub: "Round-robin",      iconBg:"rgba(212,175,55,0.15)",  iconColor:"#D4AF37",  bg:"rgba(212,175,55,0.06)",   border:"1px solid rgba(212,175,55,0.22)",   shadow:"0 4px 20px rgba(212,175,55,0.1)" },
  { icon: Mail,          label: "Send Email",     sub: "Welcome sequence", iconBg:"rgba(139,92,246,0.15)",  iconColor:"#8b5cf6",  bg:"rgba(139,92,246,0.06)",   border:"1px solid rgba(139,92,246,0.22)",   shadow:"0 4px 20px rgba(139,92,246,0.1)" },
  { icon: MessageCircle, label: "WhatsApp",       sub: "Follow-up msg",    iconBg:"rgba(37,211,102,0.15)", iconColor:"#25D366",  bg:"rgba(37,211,102,0.06)",   border:"1px solid rgba(37,211,102,0.22)",   shadow:"0 4px 20px rgba(37,211,102,0.1)" },
  { icon: CheckSquare,   label: "Create Task",    sub: "Schedule call",    iconBg:"rgba(245,158,11,0.15)",  iconColor:"#f59e0b",  bg:"rgba(245,158,11,0.06)",   border:"1px solid rgba(245,158,11,0.22)",   shadow:"0 4px 20px rgba(245,158,11,0.1)" },
  { icon: Bell,          label: "Notify Manager", sub: "Slack alert",      iconBg:"rgba(0,168,107,0.15)",  iconColor:"#00A86B",  bg:"rgba(0,168,107,0.06)",    border:"1px solid rgba(0,168,107,0.22)",    shadow:"0 4px 20px rgba(0,168,107,0.1)" },
];

const WORKFLOWS = [
  {
    id:"lead-nurture", name:"Lead Nurture", emoji:"🎯", trigger:"New Lead Created",
    runs:"847", time:"3.4s", success:"99.8%",
    steps: workflowSteps,
    logs:[
      { name:"John Smith",      action:"Lead created → workflow started",         time:"2s"  },
      { name:"Sarah Parker",    action:"Assigned to: Alex (round-robin) ✓",       time:"8s"  },
      { name:"Michael Torres",  action:"Welcome email sent ✓",                    time:"45s" },
      { name:"Priya Sharma",    action:"WhatsApp: 'Hi Priya, thanks for...' ✓",  time:"2m"  },
      { name:"David Chen",      action:"Task: Schedule demo call — created ✓",    time:"3m"  },
    ],
  },
  {
    id:"deal-won", name:"Deal Won", emoji:"🏆", trigger:"Deal Stage = Won",
    runs:"312", time:"1.8s", success:"100%",
    steps:[
      { icon:Target,        label:"Deal Won",       sub:"Stage trigger",   iconBg:"rgba(0,168,107,0.15)",  iconColor:"#00A86B", bg:"rgba(0,168,107,0.06)",  border:"1px solid rgba(0,168,107,0.22)",  shadow:"0 4px 20px rgba(0,168,107,0.1)" },
      { icon:UserPlus,      label:"Create Customer",sub:"Auto-profile",    iconBg:"rgba(59,130,246,0.15)", iconColor:"#3b82f6", bg:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.22)", shadow:"0 4px 20px rgba(59,130,246,0.1)" },
      { icon:Mail,          label:"Welcome Email",  sub:"Onboarding kit",  iconBg:"rgba(139,92,246,0.15)", iconColor:"#8b5cf6", bg:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.22)", shadow:"0 4px 20px rgba(139,92,246,0.1)" },
      { icon:CheckSquare,   label:"Create Tasks",   sub:"5 tasks set",     iconBg:"rgba(245,158,11,0.15)", iconColor:"#f59e0b", bg:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.22)", shadow:"0 4px 20px rgba(245,158,11,0.1)" },
      { icon:Bell,          label:"Alert CS Team",  sub:"Handoff sent",    iconBg:"rgba(212,175,55,0.15)", iconColor:"#D4AF37", bg:"rgba(212,175,55,0.06)", border:"1px solid rgba(212,175,55,0.22)", shadow:"0 4px 20px rgba(212,175,55,0.1)" },
    ],
    logs:[
      { name:"TechFlow Inc",   action:"Deal won ($48K) → workflow triggered",     time:"5m"  },
      { name:"CloudScale Ltd", action:"Customer profile auto-created ✓",          time:"22m" },
      { name:"RetailPro",      action:"Onboarding email sent to CEO ✓",           time:"1h"  },
      { name:"HealthAI Corp",  action:"5 onboarding tasks assigned to CS ✓",      time:"2h"  },
      { name:"GrowthBridge",   action:"CS team notified via Slack ✓",             time:"3h"  },
    ],
  },
  {
    id:"churn-alert", name:"Churn Alert", emoji:"🛡️", trigger:"Health Score < 40",
    runs:"63", time:"2.1s", success:"97.6%",
    steps:[
      { icon:Shield,        label:"Risk Detected", sub:"Score < 40",      iconBg:"rgba(239,68,68,0.15)",   iconColor:"#ef4444", bg:"rgba(239,68,68,0.06)",  border:"1px solid rgba(239,68,68,0.22)",  shadow:"0 4px 20px rgba(239,68,68,0.1)" },
      { icon:BarChart3,     label:"Analyze Risk",  sub:"AI assessment",   iconBg:"rgba(139,92,246,0.15)", iconColor:"#8b5cf6", bg:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.22)", shadow:"0 4px 20px rgba(139,92,246,0.1)" },
      { icon:MessageCircle, label:"Alert CSM",     sub:"Personal reach",  iconBg:"rgba(37,211,102,0.15)", iconColor:"#25D366", bg:"rgba(37,211,102,0.06)", border:"1px solid rgba(37,211,102,0.22)", shadow:"0 4px 20px rgba(37,211,102,0.1)" },
      { icon:CheckSquare,   label:"Recovery Task", sub:"Urgent priority", iconBg:"rgba(245,158,11,0.15)", iconColor:"#f59e0b", bg:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.22)", shadow:"0 4px 20px rgba(245,158,11,0.1)" },
      { icon:Bell,          label:"Alert VP Sales",sub:"Executive loop",  iconBg:"rgba(212,175,55,0.15)", iconColor:"#D4AF37", bg:"rgba(212,175,55,0.06)", border:"1px solid rgba(212,175,55,0.22)", shadow:"0 4px 20px rgba(212,175,55,0.1)" },
    ],
    logs:[
      { name:"Acme Corp",      action:"Health score → 32 (below threshold) ⚠️",  time:"1m"  },
      { name:"DataStream LLC", action:"AI: HIGH RISK — support tickets +40% ✓",  time:"8m"  },
      { name:"NovaTech",       action:"CSM alerted via WhatsApp: 'At risk' ✓",   time:"25m" },
      { name:"BlueSky Inc",    action:"Urgent recovery task created ✓",           time:"1h"  },
      { name:"Pinnacle SaaS",  action:"VP Sales alerted — account saved ✓",      time:"2h"  },
    ],
  },
];

const commChannels = [
  { icon: MessageCircle, title: "WhatsApp CRM",    color: "#25D366", desc: "Manage WhatsApp conversations, run broadcast campaigns, and set auto-replies — all inside your CRM.", tags: ["Broadcast","Auto-reply","Chat History"] },
  { icon: Mail,          title: "Email Marketing", color: "#3b82f6", desc: "Design beautiful campaigns, track opens and clicks, and run A/B tests with a built-in drag-and-drop editor.", tags: ["Templates","Analytics","A/B Testing"] },
  { icon: MessageSquare, title: "Live Chat",       color: "#8b5cf6", desc: "Engage website visitors in real time. Route conversations to the right rep and log every interaction automatically.", tags: ["Real-time","Auto-route","Transcripts"] },
  { icon: Zap,           title: "Campaigns",       color: "#D4AF37", desc: "Multi-channel campaigns across email and WhatsApp. Set schedules, target segments, and track full ROI.", tags: ["Multi-channel","Scheduling","ROI"] },
  { icon: Inbox,         title: "Unified Inbox",   color: "#00A86B", desc: "One inbox for every channel. No context switching, no missed messages, no dropped conversations ever.", tags: ["All channels","Team view","Tagging"] },
];

const securityBadges = [
  { icon: Shield, title: "SOC 2 Type II",  desc: "Certified & audited annually" },
  { icon: Lock,   title: "GDPR",           desc: "Fully compliant, EU-ready" },
  { icon: Key,    title: "256-bit AES",    desc: "All data encrypted at rest" },
  { icon: Eye,    title: "Audit Trails",   desc: "Every action logged & tracked" },
  { icon: Server, title: "99.99% Uptime",  desc: "SLA-backed infrastructure" },
];

/* ══════════════════════════════════════════════
   AUTOMATION SHOWCASE
══════════════════════════════════════════════ */
type ThemeObj = ReturnType<typeof makeTheme>;

function AutomationShowcase({ T, dark, goldGrad }: { T: ThemeObj; dark: boolean; goldGrad: string }) {
  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const [activeStep,     setActiveStep]     = useState(0);
  const [logCount,       setLogCount]       = useState(2);

  const wf = WORKFLOWS[activeWorkflow];

  useEffect(() => { setActiveStep(0); setLogCount(2); }, [activeWorkflow]);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % wf.steps.length), 1700);
    return () => clearInterval(t);
  }, [activeWorkflow, wf.steps.length]);

  useEffect(() => {
    if (logCount >= wf.logs.length) return;
    const t = setTimeout(() => setLogCount(c => c + 1), 900);
    return () => clearTimeout(t);
  }, [logCount, activeWorkflow, wf.logs.length]);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.mockupBg, border:`1px solid ${T.mockupBorder}`, boxShadow: dark ? "0 32px 80px rgba(0,0,0,0.55)" : "0 20px 50px rgba(0,0,0,0.1)" }}>

      {/* Workflow tabs */}
      <div className="flex border-b" style={{ borderColor: T.mockupBorder }}>
        {WORKFLOWS.map((w, i) => (
          <button key={w.id} onClick={() => setActiveWorkflow(i)}
            className="flex-1 px-3 py-3.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            style={{
              color: activeWorkflow === i ? "#D4AF37" : T.text2,
              borderBottom: activeWorkflow === i ? "2px solid #D4AF37" : "2px solid transparent",
              background: activeWorkflow === i ? (dark ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.04)") : "transparent",
            }}>
            <span>{w.emoji}</span>{w.name}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3">
        {/* ── Canvas (left 2/3) ── */}
        <div className="lg:col-span-2 p-6" style={{ borderRight:`1px solid ${T.mockupBorder}` }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-2"
                style={{ background:"rgba(212,175,55,0.12)", color:"#D4AF37", border:"1px solid rgba(212,175,55,0.25)" }}>
                TRIGGER: {wf.trigger}
              </span>
              <p className="text-sm font-bold" style={{ color: T.text1 }}>{wf.name} Workflow</p>
              <p className="text-xs mt-0.5" style={{ color: T.text2 }}>Running · {wf.runs} executions this month</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background:"rgba(0,168,107,0.1)", border:"1px solid rgba(0,168,107,0.2)" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span className="text-xs font-semibold" style={{ color:"#00A86B" }}>Active</span>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-wrap items-center">
            {wf.steps.map((step, i) => {
              const Icon = step.icon;
              const isActive    = activeStep === i;
              const isCompleted = activeStep > i;
              return (
                <div key={step.label} className="flex items-center">
                  <motion.div
                    animate={isActive ? { scale:1.08, y:-5 } : { scale:1, y:0 }}
                    transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
                    className="w-[112px] rounded-2xl p-3.5 text-center relative overflow-hidden"
                    style={{
                      background: step.bg,
                      border: isActive ? `2px solid ${step.iconColor}` : step.border,
                      boxShadow: isActive ? `0 0 24px ${step.iconColor}44, ${step.shadow}` : step.shadow,
                      opacity: isCompleted ? 0.65 : 1,
                    }}>
                    {/* pulse ring on active */}
                    {isActive && (
                      <motion.div animate={{ scale:[1,1.6,1], opacity:[0.25,0,0.25] }}
                        transition={{ duration:1.6, repeat:Infinity }}
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ background: step.iconColor, opacity:0.12 }} />
                    )}
                    {/* completed check */}
                    {isCompleted && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background:"#00A86B", boxShadow:"0 2px 8px rgba(0,168,107,0.5)" }}>
                        <Check size={9} className="text-white" />
                      </div>
                    )}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                      style={{ background: step.iconBg }}>
                      <Icon size={15} style={{ color: step.iconColor }} />
                    </div>
                    <p className="text-[11px] font-bold leading-tight" style={{ color: T.text1 }}>{step.label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: T.text2 }}>{step.sub}</p>
                  </motion.div>

                  {/* Animated connector */}
                  {i < wf.steps.length - 1 && (
                    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width:"28px" }}>
                      <div className="w-full h-px" style={{ background:`${step.iconColor}35` }} />
                      {isActive && (
                        <motion.div
                          animate={{ x:[-10, 10] }}
                          transition={{ duration:0.55, repeat:Infinity, ease:"linear" }}
                          className="absolute w-2 h-2 rounded-full"
                          style={{ background: step.iconColor, boxShadow:`0 0 7px ${step.iconColor}99` }}
                        />
                      )}
                      <ChevronRight size={12} className="absolute" style={{ color: T.text3, opacity:0.5 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5" style={{ borderTop:`1px solid ${T.mockupCardBrd}` }}>
            {[[wf.runs,"Runs this month"],[wf.time,"Avg execution"],[wf.success,"Success rate"]].map(([val,label]) => (
              <div key={label} className="text-center rounded-xl py-3"
                style={{ background: T.mockupCardBg, border:`1px solid ${T.mockupCardBrd}` }}>
                <p className="text-lg font-black" style={{ background: goldGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{val}</p>
                <p className="text-[10px] mt-0.5" style={{ color: T.text2 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Live Log (right 1/3) ── */}
        <div className="p-5 border-t lg:border-t-0" style={{ borderColor: T.mockupBorder }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold" style={{ color: T.text1 }}>Example Execution Log</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: T.text3 }} />
              <span className="text-[10px] font-semibold" style={{ color: T.text3 }}>Sample preview</span>
            </div>
          </div>
          <div className="space-y-2 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {wf.logs.slice(0, logCount).map((log, li) => (
                <motion.div key={`${activeWorkflow}-${li}`}
                  initial={{ opacity:0, x:-16, height:0 }}
                  animate={{ opacity:1, x:0, height:"auto" }}
                  exit={{ opacity:0, height:0 }}
                  transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
                  className="rounded-xl p-3"
                  style={{ background: T.mockupCardBg, border:`1px solid ${T.mockupCardBrd}` }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] font-bold" style={{ color: T.text1 }}>{log.name}</p>
                    <span className="text-[9px]" style={{ color: T.text3 }}>{log.time} ago</span>
                  </div>
                  <p className="text-[10px] leading-snug" style={{ color: T.text2 }}>{log.action}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-4 pt-3" style={{ borderTop:`1px solid ${T.mockupCardBrd}` }}>
            <p className="text-[10px] text-center" style={{ color: T.text3 }}>
              {wf.runs} total executions this month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════ */
interface LandingPageProps { onGetStarted: () => void }

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [dark,          setDark]          = useState(true);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [scrolled,      setScrolled]      = useState(false);
  const [videoOpen,     setVideoOpen]     = useState(false);
  const [activeModule,  setActiveModule]  = useState<ModuleContent | null>(null);
  const [demoOpen,      setDemoOpen]      = useState(false);
  const [demoSent,      setDemoSent]      = useState(false);
  const [demoForm,      setDemoForm]      = useState({ name:"", email:"", company:"", time:"" });

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOp = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem("kvl_theme");
    if (saved) setDark(saved === "dark");
  }, []);
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("kvl_theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const T = makeTheme(dark);

  // Gold gradient stays same in both modes
  const goldGrad   = "linear-gradient(135deg,#D4AF37,#F5C842)"; // red — CTAs, buttons
  const goldShadow = "0 8px 32px rgba(212,175,55,0.35)";

  return (
    <div style={{ background: T.bg, color: T.text1 }} className="min-h-screen overflow-x-hidden transition-colors duration-300">
      <AnalyticsTracker />
      <ConsentBanner />

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
        style={{ background: scrolled ? T.navBg : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? `1px solid ${T.navBorder}` : "none" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/kvl-logo-trans.png" alt="KVL CRM" className="h-12 w-auto object-contain" />
          </div>

          <div className="hidden md:flex items-center gap-1 ml-8">
            {["Features","How it Works","Pricing","Testimonials"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`}
                className="px-3 py-1.5 text-sm rounded-lg transition-all"
                style={{ color: T.text2 }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text1)}
                onMouseLeave={e => (e.currentTarget.style.color = T.text2)}>
                {l}
              </a>
            ))}
          </div>
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={toggleDark}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: T.toggleBg }}>
              {dark
                ? <Sun size={16} style={{ color: "#D4AF37" }} />
                : <Moon size={16} style={{ color: T.toggleIcon }} />}
            </motion.button>

            <button onClick={onGetStarted} className="hidden md:block px-4 py-1.5 text-sm transition-colors" style={{ color: T.text2 }}>
              Sign In
            </button>
            <motion.button whileHover={{ scale: 1.05, boxShadow: "0 4px 20px rgba(212,175,55,0.4)" }} whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="hidden md:block px-5 py-2.5 rounded-xl text-sm font-black text-black shadow-lg"
              style={{ background: goldGrad, boxShadow: "0 4px 18px rgba(212,175,55,0.3)" }}>
              Get Started Free
            </motion.button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: T.toggleBg }}>
              {menuOpen ? <X size={17} style={{ color: T.text2 }} /> : <Menu size={17} style={{ color: T.text2 }} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden px-6 py-4 space-y-2" style={{ background: T.navBg, borderTop: `1px solid ${T.navBorder}` }}>
              {["Features","How it Works","Pricing","Testimonials"].map((l) => (
                <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`} onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm rounded-lg" style={{ color: T.text2 }}>{l}</a>
              ))}
              <button onClick={onGetStarted} className="w-full mt-2 px-4 py-2.5 rounded-xl text-sm font-black text-black" style={{ background: goldGrad }}>
                Get Started Free
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Real background photo — subtle dark overlay */}
        <img
          src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1920&q=60"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ opacity: dark ? 0.06 : 0.08 }}
        />
        <Particles dark={dark} />

        {/* Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ x:[0,40,0], y:[0,-30,0] }} transition={{ duration:18, repeat:Infinity, ease:"easeInOut" }}
            className="absolute top-1/4 left-1/5 w-[450px] h-[450px] rounded-full blur-[150px]"
            style={{ background: T.orb1, opacity: dark ? 0.18 : 0.25 }} />
          <motion.div animate={{ x:[0,-30,0], y:[0,40,0] }} transition={{ duration:22, repeat:Infinity, ease:"easeInOut" }}
            className="absolute bottom-1/4 right-1/5 w-[350px] h-[350px] rounded-full blur-[130px]"
            style={{ background: T.orb2, opacity: dark ? 0.13 : 0.2 }} />
          <div className="absolute inset-0" style={{ opacity: dark ? 0.025 : 0.05,
            backgroundImage: `linear-gradient(${T.gridCol} 1px,transparent 1px),linear-gradient(90deg,${T.gridCol} 1px,transparent 1px)`,
            backgroundSize: "60px 60px" }} />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOp }} className="relative max-w-7xl mx-auto px-6 pt-28 pb-16 text-center">
          {/* Badge */}
          <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-semibold mb-10"
            style={{ borderColor: T.badgeBorder, background: T.badgeBg, color: T.badgeText }}>
            <motion.span animate={{ scale:[1,1.5,1] }} transition={{ duration:1.5, repeat:Infinity }}
              className="w-1.5 h-1.5 rounded-full" style={{ background: T.badgeText }} />
            Trusted by 2,400+ Revenue Teams Worldwide
            <ChevronRight size={12} />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.0] mb-6">
            <span style={{ color: T.text1 }}>Your Entire Revenue</span><br />
            <span style={{ background: "linear-gradient(90deg,#D4AF37,#F5C842,#D4AF37)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundSize:"200%", animation:"shimmer 2.5s linear infinite" }}>
              Engine. Unified.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.2 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: T.text2 }}>
            Manage sales, marketing, customer success, finance, automation and communication from a single intelligent platform.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <motion.button whileHover={{ scale:1.06, boxShadow:"0 0 40px rgba(212,175,55,0.5)" }} whileTap={{ scale:0.97 }}
              onClick={() => { kvlAnalytics.track("cta_click", { location: "hero", cta: "Start Free — No Card Needed" }); onGetStarted(); }}
              className="group flex items-center gap-2.5 px-9 py-4 rounded-2xl text-base font-bold text-black"
              style={{ background: goldGrad, boxShadow: goldShadow }}>
              Start Free — No Card Needed
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button whileHover={{ scale:1.03, boxShadow:"0 0 28px rgba(0,168,107,0.3)" }} whileTap={{ scale:0.97 }}
              onClick={() => { kvlAnalytics.track("demo_click", { location: "hero" }); setDemoOpen(true); }}
              className="flex items-center gap-3 px-7 py-4 rounded-2xl border text-base font-medium transition-all"
              style={{ borderColor:"rgba(0,168,107,0.35)", background:"rgba(0,168,107,0.08)", color: T.ctaSecText }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:"rgba(0,168,107,0.15)", border:"1px solid rgba(0,168,107,0.3)" }}>
                <Calendar size={14} style={{ color: "#00A86B" }} />
              </div>
              Book Live Demo
            </motion.button>
          </motion.div>

          {/* Trust row */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}
            className="flex flex-wrap items-center justify-center gap-6 text-xs mb-20" style={{ color: T.text3 }}>
            {["No credit card required","14-day free trial","Cancel anytime","GDPR compliant"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><Check size={11} style={{ color:"#00843D" }} />{t}</span>
            ))}
          </motion.div>

        </motion.div>
      </section>

      {/* ── PLATFORM MODULES ─────────────────────────────────── */}
      <section className="py-24 transition-colors duration-300" style={{ background: dark ? "rgba(212,175,55,0.015)" : "rgba(212,175,55,0.025)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Complete Platform</span>
            <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Every Module. One Platform.</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: T.text2 }}>From lead capture to invoice — manage your entire revenue operation in a single beautifully unified platform.</p>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {modules.map((m, i) => {
              const Icon = m.icon;
              return (
                <FadeIn key={m.title} delay={i * 0.04}>
                  <motion.div whileHover={{ y:-6, scale:1.04 }} transition={{ duration:0.2 }}
                    className="rounded-2xl p-4 text-center cursor-pointer transition-all group"
                    style={{ border:`1px solid ${T.cardBorder}`, background: T.cardBg }}
                    onClick={() => setActiveModule(MODULE_CONTENT[m.title] ?? null)}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = m.color + "55"; el.style.background = m.color + "0D"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardBorder; el.style.background = T.cardBg; }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                      style={{ background: m.color + "1A", border:`1px solid ${m.color}33` }}>
                      <Icon size={18} style={{ color: m.color }} />
                    </div>
                    <p className="text-[11px] font-bold leading-tight" style={{ color: T.text1 }}>{m.title}</p>
                    <p className="text-[9px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: m.color }}>Learn more →</p>
                  </motion.div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AUTOMATION WORKFLOW ───────────────────────────────── */}
      <section className="py-28 transition-colors duration-300" style={{ background: T.howBg }}>
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Workflow Automation</span>
            <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Your Pipeline Runs Itself</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>Build powerful automations in minutes. No code. No complexity. Just results.</p>
          </FadeIn>
          <FadeIn>
            <AutomationShowcase T={T} dark={dark} goldGrad={goldGrad} />
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-14">
            {[
              ["500+","Pre-built Templates","Ready-to-use automation recipes for every sales scenario."],
              ["10×","Faster Follow-ups","Automated sequences engage leads before competitors do."],
              ["100%","Hands-free Execution","Workflows run 24/7. Your team focuses on closing."],
            ].map(([val, title, desc]) => (
              <FadeIn key={title} className="text-center">
                <p className="text-3xl font-black mb-1" style={{ background: goldGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{val}</p>
                <p className="text-sm font-bold mb-1" style={{ color: T.text1 }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: T.text2 }}>{desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 transition-colors duration-300" style={{ background: T.howBg }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Simple Setup</span>
            <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Up and Running in Minutes</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>No complex onboarding. No IT department needed. Start closing deals today.</p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-9 left-[33%] right-[33%] h-px"
              style={{ background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)" }} />
            {steps.map((s,i) => {
              const Icon = s.icon;
              return (
                <FadeIn key={s.num} delay={i*0.15}>
                  <div className="text-center">
                    {/* Step image */}
                    <div className="relative mb-6 rounded-2xl overflow-hidden shadow-xl mx-auto"
                      style={{ border:`1px solid rgba(212,175,55,0.2)` }}>
                      <img src={s.img} alt={s.title}
                        className="w-full object-cover"
                        style={{ height: "160px", filter: dark ? "brightness(0.75) saturate(0.9)" : "brightness(0.95)" }}
                      />
                      {/* Gold overlay tint */}
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background:"linear-gradient(to bottom, transparent 50%, rgba(212,175,55,0.15) 100%)" }} />
                      {/* Step number badge */}
                      <div className="absolute top-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-black shadow-lg"
                        style={{ background: goldGrad }}>
                        {i+1}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <motion.div whileHover={{ scale:1.1 }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: goldGrad, boxShadow:"0 4px 16px rgba(212,175,55,0.3)" }}>
                        <Icon size={18} className="text-black" />
                      </motion.div>
                      <h3 className="text-base font-bold" style={{ color: T.text1 }}>{s.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: T.text2 }}>{s.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CUSTOMER SUCCESS ──────────────────────────────────── */}
      <section id="testimonials" className="py-28 max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Customer Success Stories</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Real Companies. Real Revenue.</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>See how revenue teams use KVl to close more deals, retain more customers, and grow faster.</p>
        </FadeIn>

        {/* Featured Case Study */}
        <FadeIn className="mb-8">
          <div className="relative rounded-3xl overflow-hidden"
            style={{ background: dark ? "linear-gradient(135deg,#0d1424,#080c14)" : "linear-gradient(135deg,#ffffff,#f8f6f1)", border:"1px solid rgba(212,175,55,0.2)", boxShadow: dark ? "0 32px 80px rgba(0,0,0,0.5)" : "0 24px 60px rgba(0,0,0,0.08)" }}>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
              style={{ background:"radial-gradient(circle,rgba(212,175,55,0.15),transparent 70%)" }} />
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-10 md:p-12">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black" style={{ background:"rgba(212,175,55,0.15)", color:"#D4AF37", border:"1px solid rgba(212,175,55,0.3)" }}>FEATURED CASE STUDY</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-4" style={{ color: T.text1 }}>
                  "We 3× our pipeline in 90 days. KVl is the only platform we'll ever need."
                </h3>
                <p className="text-sm leading-relaxed mb-8" style={{ color: T.text2 }}>
                  GrowthBridge had 30+ sales reps using 6 different tools — Sheets, HubSpot, WhatsApp personal phones, and manual email. After migrating to KVl, their pipeline became visible, automations replaced 40% of manual work, and deal close time dropped from 28 days to 17.
                </p>
                <div className="flex items-center gap-4 mb-8">
                  <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=56&h=56&fit=crop&q=80"
                    alt="Marcus Williams" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
                    style={{ outline:"2px solid rgba(212,175,55,0.3)" }} />
                  <div>
                    <p className="text-sm font-black" style={{ color: T.text1 }}>Marcus Williams</p>
                    <p className="text-xs" style={{ color: T.text2 }}>CEO, GrowthBridge · 32 reps · Series A</p>
                    <div className="flex gap-0.5 mt-1">{[1,2,3,4,5].map(j=><Star key={j} size={11} className="fill-amber-400" style={{ color:"#D4AF37" }}/>)}</div>
                  </div>
                </div>
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-black"
                  style={{ background: goldGrad, boxShadow:"0 4px 20px rgba(212,175,55,0.35)" }}>
                  Read Full Story <ArrowRight size={14} />
                </motion.button>
              </div>
              {/* Metrics panel */}
              <div className="p-10 md:p-12 border-t md:border-t-0 md:border-l flex flex-col justify-center gap-6"
                style={{ borderColor:"rgba(212,175,55,0.12)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:"#D4AF37" }}>Results After 90 Days</p>
                {[
                  { metric:"3.2×",  label:"Pipeline Growth",        sub:"From $980K to $3.1M",        color:"#D4AF37" },
                  { metric:"39%",   label:"Faster Deal Closing",     sub:"28 days → 17 days avg",      color:"#00A86B" },
                  { metric:"94%",   label:"Customer Retention",      sub:"Up from 71% previous year",  color:"#3b82f6" },
                  { metric:"$180K", label:"Revenue Saved (Churn)",   sub:"AI caught at-risk account",  color:"#8b5cf6" },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: r.color + "15", border:`1px solid ${r.color}25` }}>
                      <span className="text-lg font-black" style={{ color: r.color }}>{r.metric}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: T.text1 }}>{r.label}</p>
                      <p className="text-xs" style={{ color: T.text2 }}>{r.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* 3 smaller case study cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name:"Sarah Chen",  role:"VP Sales, TechFlow Inc",    img:"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=64&h=64&fit=crop&q=80", company:"TechFlow Inc", metric:"40%", metricLabel:"Faster closings", color:"#00A86B", quote:"Our pipeline is 3× larger. The revenue intelligence paid for itself in week one.", industry:"B2B SaaS · 25 reps" },
            { name:"Priya Patel", role:"Head of Revenue, CloudScale",img:"https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&q=80", company:"CloudScale",  metric:"$180K",metricLabel:"Churn prevented",  color:"#8b5cf6", quote:"The churn risk AI caught our biggest account 2 weeks before we would have noticed.", industry:"Cloud Infrastructure · 15 reps" },
            { name:"James Okafor",role:"CEO, RetailPro",             img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&q=80", company:"RetailPro",   metric:"2.8×", metricLabel:"WhatsApp ROI",   color:"#D4AF37", quote:"WhatsApp CRM changed everything. 95% open rates vs 22% on email. Night and day.", industry:"Retail Technology · 40 reps" },
          ].map((c, i) => (
            <FadeIn key={c.name} delay={i*0.1}>
              <motion.div whileHover={{ y:-5 }} transition={{ duration:0.2 }}
                className="rounded-2xl p-6 transition-all h-full flex flex-col"
                style={{ border:`1px solid ${T.cardBorder}`, background: T.cardBg }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.color + "44"; el.style.background = c.color + "06"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardBorder; el.style.background = T.cardBg; }}>
                {/* Metric highlight */}
                <div className="flex items-center justify-between mb-5">
                  <div className="px-3 py-1.5 rounded-xl" style={{ background: c.color + "15", border:`1px solid ${c.color}25` }}>
                    <span className="text-xl font-black" style={{ color: c.color }}>{c.metric}</span>
                    <span className="text-[10px] ml-1.5 font-semibold" style={{ color: c.color }}>{c.metricLabel}</span>
                  </div>
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(j=><Star key={j} size={11} className="fill-amber-400" style={{ color:"#D4AF37" }}/>)}</div>
                </div>
                <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: T.text2 }}>"{c.quote}"</p>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop:`1px solid ${T.cardBorder}` }}>
                  <img src={c.img} alt={c.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    style={{ outline:`2px solid ${c.color}33` }}
                    onError={e => { const img = e.target as HTMLImageElement; img.style.display="none"; }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: T.text1 }}>{c.name}</p>
                    <p className="text-[10px]" style={{ color: T.text3 }}>{c.industry}</p>
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        {/* Global stats bar */}
        <FadeIn className="mt-12">
          <div className="rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
            style={{ background: dark ? "rgba(212,175,55,0.04)" : "rgba(212,175,55,0.06)", border:"1px solid rgba(212,175,55,0.15)" }}>
            {[["2,400+","Companies worldwide"],["$2.8B+","Revenue processed"],["94%","Avg retention rate"],["4.9★","Customer satisfaction"]].map(([val,label]) => (
              <div key={label}>
                <p className="text-3xl font-black mb-1" style={{ background: goldGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{val}</p>
                <p className="text-xs" style={{ color: T.text2 }}>{label}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── COMMUNICATION HUB ─────────────────────────────────── */}
      <section className="py-28 max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Unified Communications</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Every Conversation. One Inbox.</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>WhatsApp, email, live chat — manage every customer touchpoint from a single platform, with full context on every interaction.</p>
        </FadeIn>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {commChannels.map((ch, i) => {
            const Icon = ch.icon;
            return (
              <FadeIn key={ch.title} delay={i*0.08}>
                <motion.div whileHover={{ y:-6 }} transition={{ duration:0.2 }}
                  className="rounded-2xl p-6 transition-all"
                  style={{ border:`1px solid ${T.cardBorder}`, background: T.cardBg }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = ch.color + "55"; el.style.background = ch.color + "08"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardBorder; el.style.background = T.cardBg; }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: ch.color + "18", border:`1px solid ${ch.color}33` }}>
                    <Icon size={22} style={{ color: ch.color }} />
                  </div>
                  <h3 className="text-sm font-bold mb-2" style={{ color: T.text1 }}>{ch.title}</h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: T.text2 }}>{ch.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ch.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: ch.color + "15", color: ch.color, border:`1px solid ${ch.color}25` }}>{tag}</span>
                    ))}
                  </div>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ── SECURITY & RELIABILITY ────────────────────────────── */}
      <section className="py-28 transition-colors duration-300" style={{ background: T.howBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Enterprise Trust</span>
            <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Built for Enterprise Security</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>Bank-grade security, compliance certifications, and 99.99% uptime SLA — so your data is always safe.</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
            {securityBadges.map((b, i) => {
              const Icon = b.icon;
              return (
                <FadeIn key={b.title} delay={i*0.08}>
                  <motion.div whileHover={{ y:-5 }} transition={{ duration:0.2 }}
                    className="rounded-2xl p-5 text-center transition-all"
                    style={{ border:`1px solid ${T.cardBorder}`, background: T.cardBg }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(212,175,55,0.4)"; el.style.background = "rgba(212,175,55,0.05)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardBorder; el.style.background = T.cardBg; }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)" }}>
                      <Icon size={18} style={{ color:"#D4AF37" }} />
                    </div>
                    <p className="text-xs font-black mb-0.5" style={{ color: T.text1 }}>{b.title}</p>
                    <p className="text-[10px]" style={{ color: T.text2 }}>{b.desc}</p>
                  </motion.div>
                </FadeIn>
              );
            })}
          </div>
          <FadeIn>
            <div className="rounded-2xl p-8 text-center"
              style={{ background: dark ? "rgba(0,132,61,0.05)" : "rgba(0,132,61,0.04)", border:"1px solid rgba(0,132,61,0.15)" }}>
              <p className="text-5xl font-black mb-1" style={{ color:"#00A86B" }}>99.99%</p>
              <p className="text-sm font-semibold mb-1" style={{ color: T.text1 }}>Uptime SLA — Last 12 Months</p>
              <p className="text-xs mb-5" style={{ color: T.text2 }}>Monitored 24/7 across 6 global regions</p>
              <div className="flex justify-center gap-1">
                {[32,28,30,32,31,29,32,30,28,32,31,30,29,32,28,30,32,31,29,28,30,32,4,32,31,30,32,28,29,31,30,32,31,28,30,29,32,31,30,28,32,31,29,30,32,28,31,30,29,32,31,28].map((h,i) => (
                  <motion.div key={i} initial={{ scaleY:0 }} animate={{ scaleY:1 }}
                    transition={{ delay:0.5+i*0.01 }}
                    className="w-1.5 rounded-full origin-bottom"
                    style={{ height:`${h}px`, background: h < 10 ? "rgba(245,158,11,0.7)" : "#00843D", opacity:0.85 }} />
                ))}
              </div>
              <p className="text-[10px] mt-3" style={{ color: T.text3 }}>Weekly uptime — past 12 months. One minor incident in week 23.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-28 max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <div className="relative rounded-3xl p-16 overflow-hidden transition-all"
            style={{ border:`1px solid ${T.ctaBoxBorder}`, background: T.ctaBoxBg }}>
            <motion.div animate={{ scale:[1,1.4,1], opacity:[0.15,0.3,0.15] }} transition={{ duration:5, repeat:Infinity }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 pointer-events-none"
              style={{ background:"radial-gradient(ellipse,rgba(212,175,55,0.4),transparent 70%)", filter:"blur(40px)" }} />
            <div className="relative">
              <motion.div whileHover={{ rotate:10, scale:1.1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-2xl"
                style={{ background: goldGrad, boxShadow:"0 8px 36px rgba(212,175,55,0.4)" }}>
                <Rocket size={28} className="text-black" />
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: T.text1 }}>Build a Revenue Machine That<br />
                <span style={{ background:"linear-gradient(90deg,#D4AF37,#F5C842)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Never Stops Growing.</span>
              </h2>
              <p className="text-lg max-w-lg mx-auto mb-12" style={{ color: T.text2 }}>
                Join 2,400+ companies that close more deals, in less time, with less effort.
              </p>
              <motion.button whileHover={{ scale:1.07, boxShadow:"0 0 60px rgba(212,175,55,0.55)" }} whileTap={{ scale:0.97 }}
                onClick={onGetStarted}
                className="group inline-flex items-center gap-2.5 px-12 py-5 rounded-2xl text-lg font-black text-black"
                style={{ background: goldGrad, boxShadow: goldShadow }}>
                Start Your Free Trial
                <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform" />
              </motion.button>
              <p className="mt-5 text-sm" style={{ color: T.text3 }}>14 days free · No credit card · Cancel anytime</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t py-14 transition-colors duration-300" style={{ borderColor: T.divider, background: T.footerBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/kvl-logo-trans.png" alt="KVL CRM" className="h-11 w-auto object-contain" />
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs">
              {([["Features","/features"],["Pricing","/pricing"],["Privacy","/privacy"],["Terms","/terms"],["Contact","/contact"]] as [string,string][]).map(([l,h]) => (
                <Link key={l} href={h} className="transition-colors" style={{ color: T.text3 }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.text1)}
                  onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>{l}</Link>
              ))}
            </div>
            <p className="text-xs" style={{ color: T.text3 }}>© 2025 KVl CRM · FreedomWithAI</p>
          </div>
        </div>
      </footer>

      {/* ── VIDEO MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {videoOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background:"rgba(0,0,0,0.88)", backdropFilter:"blur(16px)" }}
            onClick={() => setVideoOpen(false)}>
            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
              transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
              className="w-full max-w-4xl relative"
              onClick={e => e.stopPropagation()}>
              {/* Close */}
              <button onClick={() => setVideoOpen(false)}
                className="absolute -top-10 right-0 flex items-center gap-2 text-xs font-semibold transition-colors"
                style={{ color:"rgba(255,255,255,0.6)" }}>
                <X size={16}/> Close
              </button>
              {/* Video player */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl"
                style={{ border:`1px solid ${T.modalBorder}`, boxShadow:"0 40px 100px rgba(0,0,0,0.8)" }}>
                <video
                  src="https://assets.mixkit.co/videos/preview/mixkit-a-woman-in-a-modern-office-using-a-computer-32946-large.mp4"
                  className="w-full"
                  style={{ aspectRatio:"16/9", display:"block", background:"#000" }}
                  autoPlay
                  loop
                  muted={false}
                  controls
                  playsInline
                />
              </div>
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-sm font-semibold" style={{ color:"rgba(255,255,255,0.7)" }}>
                  KVl CRM — Full Platform Overview
                </p>
                <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}
                  onClick={() => { setVideoOpen(false); onGetStarted(); }}
                  className="px-6 py-2 rounded-xl text-sm font-black text-black"
                  style={{ background: goldGrad, boxShadow:"0 4px 16px rgba(212,175,55,0.3)" }}>
                  Get Started Free →
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODULE DETAIL MODAL ───────────────────────────────── */}
      <ModuleDetailModal
        module={activeModule}
        dark={dark}
        onClose={() => setActiveModule(null)}
        onGetStarted={onGetStarted}
      />

      {/* ── DEMO BOOKING MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)" }}
            onClick={() => { setDemoOpen(false); setDemoSent(false); }}>
            <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }}
              transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
              className="w-full max-w-md relative rounded-3xl p-8 overflow-hidden"
              style={{ background: dark ? "linear-gradient(135deg,#0d1424,#080c14)" : "#ffffff", border:"1px solid rgba(0,168,107,0.25)", boxShadow:"0 40px 100px rgba(0,0,0,0.8)" }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => { setDemoOpen(false); setDemoSent(false); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                <X size={14} style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }} />
              </button>
              {!demoSent ? (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background:"rgba(0,168,107,0.15)", border:"1px solid rgba(0,168,107,0.3)" }}>
                    <Calendar size={22} style={{ color:"#00A86B" }} />
                  </div>
                  <h2 className="text-2xl font-black mb-1" style={{ color: T.text1 }}>Book a Live Demo</h2>
                  <p className="text-sm mb-6" style={{ color: T.text2 }}>Our team will walk you through the full platform — personalized to your business.</p>
                  <div className="space-y-3">
                    {[
                      { key:"name",    placeholder:"Your Full Name",    type:"text",  required:true },
                      { key:"email",   placeholder:"Work Email",         type:"email", required:true },
                      { key:"company", placeholder:"Company Name",       type:"text",  required:false },
                    ].map(f => (
                      <input key={f.key} type={f.type} placeholder={f.placeholder} required={f.required}
                        value={(demoForm as any)[f.key]}
                        onChange={e => setDemoForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                        style={{ background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border:`1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`, color: T.text1 }} />
                    ))}
                    <select value={demoForm.time} onChange={e => setDemoForm(p => ({ ...p, time: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border:`1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`, color: demoForm.time ? T.text1 : T.text3 }}>
                      <option value="">Preferred Time Slot</option>
                      {["Morning (9-11 AM)","Afternoon (1-3 PM)","Evening (4-6 PM)"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                    onClick={() => {
                      if (!demoForm.name || !demoForm.email) return;
                      kvlAnalytics.track("form_submit", { form: "demo", company: demoForm.company, time: demoForm.time });
                      kvlAnalytics.identify({ name: demoForm.name, email: demoForm.email, company: demoForm.company });
                      setDemoSent(true);
                    }}
                    className="w-full mt-5 py-3.5 rounded-xl text-sm font-black text-black"
                    style={{ background:"linear-gradient(135deg,#00843D,#00A86B)", boxShadow:"0 4px 20px rgba(0,168,107,0.3)" }}>
                    Confirm Demo Booking
                  </motion.button>
                  <p className="text-xs text-center mt-3" style={{ color: T.text3 }}>Usually confirmed within 2 hours · No obligation</p>
                </>
              ) : (
                <div className="text-center py-6">
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:"spring", stiffness:300 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background:"rgba(0,168,107,0.15)", border:"2px solid rgba(0,168,107,0.4)" }}>
                    <Check size={28} style={{ color:"#00A86B" }} />
                  </motion.div>
                  <h3 className="text-xl font-black mb-2" style={{ color: T.text1 }}>Demo Booked!</h3>
                  <p className="text-sm mb-6" style={{ color: T.text2 }}>We'll confirm your slot at <strong>{demoForm.email}</strong> within 2 hours.</p>
                  <motion.button whileHover={{ scale:1.03 }} onClick={() => { setDemoOpen(false); setDemoSent(false); setDemoForm({ name:"", email:"", company:"", time:"" }); onGetStarted(); }}
                    className="px-8 py-3 rounded-xl text-sm font-black text-black"
                    style={{ background:"linear-gradient(135deg,#D4AF37,#F5C842)" }}>
                    Start Free Trial Meanwhile →
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}`}</style>
    </div>
  );
}
