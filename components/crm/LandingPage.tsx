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
  Calendar, Brain, FileText, Phone, Mic, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadConfig, type AppMode } from "@/lib/appConfig";
import ModuleDetailModal from "@/components/crm/ModuleDetailModal";
import { MODULE_CONTENT, type ModuleContent } from "@/lib/moduleContent";

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
function Counter({ end, suffix = "", decimals = 0 }: { end: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let s = 0; const step = end / 80;
    const t = setInterval(() => { s += step; if (s >= end) { setVal(end); clearInterval(t); } else setVal(s); }, 14);
    return () => clearInterval(t);
  }, [inView, end]);
  return <span ref={ref}>{decimals > 0 ? val.toFixed(decimals) : Math.floor(val)}{suffix}</span>;
}

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
const features = [
  { icon: TrendingUp,    grad: "from-green-400 to-emerald-400",   title: "Revenue Intelligence",   desc: "Predictive forecasting, deal scoring, and revenue insights that surface what matters before it's too late." },
  { icon: GitBranch,     grad: "from-green-500 to-teal-500",   title: "Visual Sales Pipeline",  desc: "Drag-and-drop stages with real-time value tracking. Every deal, every rep, every opportunity at a glance." },
  { icon: MessageCircle, grad: "from-emerald-500 to-teal-500",   title: "WhatsApp Integration",   desc: "Manage customer conversations from your CRM. Broadcast campaigns, auto-replies, message analytics." },
  { icon: Mail,          grad: "from-blue-500 to-cyan-500",      title: "Email Marketing Suite",  desc: "Design, send, and track campaigns with open rates, click analytics, and A/B testing built in." },
  { icon: Zap,           grad: "from-violet-500 to-purple-600",  title: "Workflow Automation",    desc: "Build sequences that run 24/7. Assign leads, send follow-ups, update pipeline — completely hands-free." },
  { icon: BarChart3,     grad: "from-rose-500 to-pink-600",      title: "Advanced Analytics",     desc: "Granular reports on revenue, rep performance, funnel velocity, and customer lifetime value — live." },
  { icon: Wallet,        grad: "from-green-500 to-emerald-600",  title: "Finance & Invoicing",    desc: "Generate invoices, track payments, manage expenses — a complete finance module built for sales teams." },
  { icon: Shield,        grad: "from-slate-500 to-slate-700",    title: "Enterprise Security",    desc: "Role-based access, encrypted sessions, audit trails, and GDPR-compliant data handling." },
];

const stats = [
  { value: 2400, suffix: "+", label: "Companies Worldwide" },
  { value: 98,   suffix: "%", label: "Customer Satisfaction" },
  { value: 3.2,  suffix: "×", label: "Revenue Growth Avg", decimals: 1 },
  { value: 40,   suffix: "%", label: "Faster Deal Closing" },
];

const testimonials = [
  { name: "Marcus Williams", role: "CEO, GrowthBridge",         img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&q=80", text: "We tried 6 different platforms over 3 years. Nothing came close. The WhatsApp integration and automation workflows are game-changers for our team of 30+ reps." },
  { name: "Sarah Chen",      role: "VP Sales, TechFlow Inc",    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&q=80", text: "Our pipeline is now 3× larger and we close deals 40% faster. The revenue intelligence alone paid for the subscription in the first week." },
  { name: "Priya Patel",     role: "Head of Revenue, CloudScale",img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&q=80", text: "The churn risk alert caught our biggest account two weeks before we would have noticed. That one insight saved us $180K in annual recurring revenue." },
];

const plans = [
  { name: "Starter",    price: 29,  features: ["Up to 5 users","1,000 contacts","Pipeline management","Email campaigns","Standard reports","Email support"],                                                                                              cta: "Start Free Trial" },
  { name: "Growth",     price: 79,  features: ["Up to 25 users","25,000 contacts","Advanced pipeline","WhatsApp CRM","Automation workflows","Finance module","Priority support"],                           popular: true,                                cta: "Start Free Trial" },
  { name: "Scale",      price: 149, features: ["Up to 100 users","250,000 contacts","All Growth features","Custom automations","AI-powered insights","Advanced analytics","Dedicated onboarding","SLA support"],                                         cta: "Start Free Trial" },
  { name: "Enterprise", price: 0,   features: ["Unlimited users","Unlimited contacts","Custom workflows","White-label option","Custom integrations","99.99% SLA","24/7 dedicated support"],                custom: true,                                  cta: "Contact Sales" },
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

const integrations = [
  { name: "Slack",            emoji: "💬", category: "Communication" },
  { name: "Google Workspace", emoji: "🔵", category: "Productivity" },
  { name: "Microsoft 365",    emoji: "🟦", category: "Productivity" },
  { name: "Stripe",           emoji: "💳", category: "Payments" },
  { name: "Zoom",             emoji: "🎥", category: "Video Calls" },
  { name: "Shopify",          emoji: "🛍️",  category: "E-commerce" },
  { name: "HubSpot",          emoji: "🟠", category: "Marketing" },
  { name: "Salesforce",       emoji: "☁️",  category: "CRM Sync" },
];

/* Real brand SVG logos — monochrome, scale to theme */
const BRAND_LOGOS = [
  {
    name: "Salesforce",
    svg: (op: number) => (
      <svg height="26" viewBox="0 0 101 70" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <path d="M42.3 7.2C46.8 2.6 53 0 59.8 0c9.3 0 17.4 5.1 21.7 12.6 3.6-1.6 7.6-2.5 11.8-2.5C105.2 10.1 116 21 116 34.4S105.2 58.7 92.3 58.7H14.1C6.3 58.7 0 52.4 0 44.6s6.2-14 13.9-14.2c-.6-2-.9-4.1-.9-6.3 0-10.5 8.3-19 18.6-19 5.5 0 10.4 2.3 13.9 6 0 0-3.2-3.9-3.2-3.9z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: "HubSpot",
    svg: (op: number) => (
      <svg height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <path d="M63.5 37.3V22.8a8.4 8.4 0 0 0 4.9-7.6C68.4 10.4 64 6 58.6 6s-9.8 4.4-9.8 9.8c0 3.3 1.6 6.2 4.1 8v14.5c-3.9.6-7.5 2.4-10.3 5L18.8 23.9a9.4 9.4 0 1 0-4.6 5.7l23.4 19a24.6 24.6 0 0 0-3.5 12.7c0 13.6 11 24.7 24.7 24.7S83.5 74.9 83.5 61.3c0-11.2-7.5-20.7-20-24zM58.8 78.6c-9.5 0-17.3-7.7-17.3-17.3s7.7-17.3 17.3-17.3 17.3 7.7 17.3 17.3-7.8 17.3-17.3 17.3z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: "Pipedrive",
    svg: (op: number) => (
      <svg height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 88C28.5 88 12 71.5 12 50S28.5 12 50 12s38 17 38 38-17 38-38 38zm0-64C36.2 24 25 35.2 25 49v27h12V49c0-7.2 5.8-13 13-13s13 5.8 13 13-5.8 13-13 13v12c13.8 0 25-11.2 25-25S63.8 24 50 24z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: "Zoho",
    svg: (op: number) => (
      <svg height="22" viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <text x="0" y="28" fontFamily="Georgia, serif" fontWeight="700" fontSize="32" fill="currentColor">Zoho</text>
      </svg>
    ),
  },
  {
    name: "Monday",
    svg: (op: number) => (
      <svg height="28" viewBox="0 0 100 28" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <circle cx="14" cy="14" r="14" fill="#F84B4B" opacity={op}/>
        <circle cx="50" cy="14" r="14" fill="#FFCB00" opacity={op}/>
        <circle cx="86" cy="14" r="14" fill="#00CA72" opacity={op}/>
      </svg>
    ),
  },
  {
    name: "Notion",
    svg: (op: number) => (
      <svg height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <path d="M12 8.5c-3.5 2.8-5 4.2-5 6.8v54c0 3.8 2.7 5.2 7 4.5l58-8.5c3.7-.5 5-2.5 5-5.5V18c0-2.7-1.5-4.5-5-4L17 21.5v-7.5c0-2 .8-3.2 2.8-4.5L59 3.5c5-3 10.5.5 10.5 5.5v71c0 4.3-2.5 7-7 7.5L8 95c-4 .5-8-2-8-7V22c0-4 2-6.5 6-7.5L78 3" fill="currentColor"/>
        <path d="M38 30L65 28v6L38 36v-6zM38 44l27-2v6L38 50v-6zM38 58l20-1v6L38 64v-6z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: "Slack",
    svg: (op: number) => (
      <svg height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <path d="M21.9 63.3a10.8 10.8 0 0 1-10.9 10.8 10.8 10.8 0 0 1-10.8-10.8 10.8 10.8 0 0 1 10.8-10.8h10.9v10.8z" fill="#E01E5A" opacity={op}/>
        <path d="M27.4 63.3a10.8 10.8 0 0 1 10.8-10.8 10.8 10.8 0 0 1 10.8 10.8v27a10.8 10.8 0 0 1-10.8 10.8 10.8 10.8 0 0 1-10.8-10.8v-27z" fill="#E01E5A" opacity={op}/>
        <path d="M38.2 21.9A10.8 10.8 0 0 1 27.4 11.1 10.8 10.8 0 0 1 38.2.3a10.8 10.8 0 0 1 10.8 10.8v10.8H38.2z" fill="#36C5F0" opacity={op}/>
        <path d="M38.2 27.4A10.8 10.8 0 0 1 49 38.2a10.8 10.8 0 0 1-10.8 10.8H11.1A10.8 10.8 0 0 1 .3 38.2a10.8 10.8 0 0 1 10.8-10.8h27.1z" fill="#36C5F0" opacity={op}/>
        <path d="M79.5 38.2a10.8 10.8 0 0 1 10.8-10.8 10.8 10.8 0 0 1 10.8 10.8 10.8 10.8 0 0 1-10.8 10.8H79.5V38.2z" fill="#2EB67D" opacity={op}/>
        <path d="M74 38.2a10.8 10.8 0 0 1-10.8 10.8A10.8 10.8 0 0 1 52.4 38.2V11.1A10.8 10.8 0 0 1 63.2.3 10.8 10.8 0 0 1 74 11.1v27.1z" fill="#2EB67D" opacity={op}/>
        <path d="M63.2 79.5A10.8 10.8 0 0 1 74 90.3a10.8 10.8 0 0 1-10.8 10.8A10.8 10.8 0 0 1 52.4 90.3V79.5h10.8z" fill="#ECB22E" opacity={op}/>
        <path d="M63.2 74a10.8 10.8 0 0 1 10.8-10.8h27a10.8 10.8 0 0 1 10.8 10.8 10.8 10.8 0 0 1-10.8 10.8H74A10.8 10.8 0 0 1 63.2 74z" fill="#ECB22E" opacity={op}/>
      </svg>
    ),
  },
  {
    name: "Stripe",
    svg: (op: number) => (
      <svg height="26" viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={op}>
        <path d="M55.5 19.2c0-2.4 2-3.3 5.2-3.3 4.7 0 10.6 1.4 15.3 3.9V6.3C71.2 4.1 66.4 3 61.5 3c-11.4 0-19 6-19 16 0 15.6 21.5 13.1 21.5 19.8 0 2.8-2.5 3.7-5.9 3.7-5.1 0-11.6-2.1-16.7-4.9v13.6C45.5 53.2 51 55 57.1 55c11.7 0 19.7-5.8 19.7-15.9-.1-16.9-21.3-13.9-21.3-19.9zM0 56.5l13.3-2.8L13.4 7l-13.4 2.8zM22.1 0L9.8 2.7l-.1 48.5 12.4-2.6zM101.3 7.7l-.8 3.7S96.7 6.7 91 6.7c-9.7 0-18.4 12.3-18.4 26.5 0 9.1 4.5 18.5 14.1 18.5 6.2 0 9.7-3.5 9.7-3.5l-.7 3h12.1L117.4 4.7l-16.1 3zm-3 31.5c-2.2 2.8-5 4.4-7.9 4.4-4 0-5.9-3.3-5.9-8.2 0-8.1 3.8-17.4 10-17.4 2.7 0 4.4 1.4 5.2 2.5l-1.4 18.7z" fill="currentColor"/>
      </svg>
    ),
  },
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
            <p className="text-xs font-bold" style={{ color: T.text1 }}>Live Execution Log</p>
            <div className="flex items-center gap-1.5">
              <motion.span animate={{ opacity:[1,0.3,1] }} transition={{ duration:1.4, repeat:Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span className="text-[10px] font-semibold" style={{ color:"#00A86B" }}>Live</span>
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
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [appMode,       setAppMode]       = useState<AppMode>("saas");
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

  useEffect(() => { setAppMode(loadConfig().mode); }, []);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const T = makeTheme(dark);

  // Gold gradient stays same in both modes
  const goldGrad   = "linear-gradient(135deg,#D4AF37,#F5C842)"; // red — CTAs, buttons
  const greenGrad  = "linear-gradient(135deg,#006B3C,#00843D)"; // green — stats, pipeline
  const goldShadow = "0 8px 32px rgba(212,175,55,0.35)";

  return (
    <div style={{ background: T.bg, color: T.text1 }} className="min-h-screen overflow-x-hidden transition-colors duration-300">

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
        style={{ background: scrolled ? T.navBg : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? `1px solid ${T.navBorder}` : "none" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: greenGrad }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-black tracking-wide" style={{ background: greenGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>KVl CRM</p>
              <p className="text-[9px] -mt-0.5 uppercase tracking-widest" style={{ color: T.text3 }}>Premium Sales Suite</p>
            </div>
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
              onClick={onGetStarted}
              className="group flex items-center gap-2.5 px-9 py-4 rounded-2xl text-base font-bold text-black"
              style={{ background: goldGrad, boxShadow: goldShadow }}>
              Start Free — No Card Needed
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button whileHover={{ scale:1.03, boxShadow:"0 0 28px rgba(0,168,107,0.3)" }} whileTap={{ scale:0.97 }}
              onClick={() => setDemoOpen(true)}
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

          {/* Live Metrics Strip */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55, duration:0.7 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {[
              { label:"Revenue Growth",    value:"3.2×",   color:"#00A86B" },
              { label:"Lead Conversion",   value:"68%",    color:"#D4AF37" },
              { label:"Customer Retention",value:"94%",    color:"#3b82f6" },
              { label:"Pipeline Value",    value:"$2.98M", color:"#8b5cf6" },
            ].map((m) => (
              <div key={m.label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
                style={{ background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderColor: m.color + "33", backdropFilter:"blur(12px)" }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: m.color }} />
                <span className="text-[11px] font-medium" style={{ color: T.text2 }}>{m.label}</span>
                <span className="text-sm font-black" style={{ color: m.color }}>{m.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Dashboard Mockup */}
          <motion.div initial={{ opacity:0, y:80, scale:0.93 }} animate={{ opacity:1, y:0, scale:1 }}
            transition={{ duration:1.2, delay:0.4, ease:[0.22,1,0.36,1] }} className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: `linear-gradient(to bottom, transparent 50%, ${T.bg} 100%)` }} />
            <div className="absolute -inset-1 rounded-3xl blur-2xl" style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.04))", opacity:0.6 }} />
            <div className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{ border:`1px solid ${T.mockupBorder}`, background: T.mockupBg, boxShadow: dark ? "0 40px 100px rgba(0,0,0,0.8)" : "0 24px 80px rgba(0,0,0,0.15)" }}>
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.mockupBorder, background: T.mockupCardBg }}>
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500/50"/><div className="w-3 h-3 rounded-full bg-amber-500/50"/><div className="w-3 h-3 rounded-full bg-emerald-500/50"/></div>
                <div className="flex-1 mx-4">
                  <div className="h-5 rounded-md flex items-center px-3 gap-2" style={{ background: T.urlBarBg, border:`1px solid ${T.urlBarBorder}` }}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500"/>
                    <span className="text-[10px]" style={{ color: T.urlText }}>app.kvlcrm.com/dashboard</span>
                  </div>
                </div>
              </div>
              {/* Mock content */}
              <div className="p-5 grid grid-cols-4 gap-3">
                {[["Pipeline Value","$2.98M","+18%","#D4AF37"],["Deals Closed","142","+32%","#10b981"],["Win Rate","68.5%","+5.2%","#8b5cf6"],["Avg Deal Size","$38.4K","+12%","#3b82f6"]].map(([label,val,chg,col]) => (
                  <div key={label} className="rounded-xl p-3" style={{ background: T.mockupCardBg, border:`1px solid ${T.mockupCardBrd}` }}>
                    <p className="text-[10px] mb-1" style={{ color: T.mockupText }}>{label}</p>
                    <p className="text-lg font-black" style={{ color: T.text1 }}>{val}</p>
                    <span className="text-[10px] font-semibold" style={{ color: col }}>{chg}</span>
                  </div>
                ))}
                <div className="col-span-3 rounded-xl p-4" style={{ background: T.mockupCardBg, border:`1px solid ${T.mockupCardBrd}` }}>
                  <p className="text-[10px] mb-3" style={{ color: T.mockupText }}>Revenue Growth 2025</p>
                  <div className="flex items-end gap-1 h-16">
                    {[35,52,44,68,58,72,65,88,75,92,82,96].map((h, i) => (
                      <motion.div key={i} initial={{ scaleY:0 }} animate={{ scaleY:1 }} transition={{ delay:0.9+i*0.04, ease:"easeOut" }}
                        className="flex-1 rounded-t-sm origin-bottom"
                        style={{ height:`${h}%`, background: i===11 ? "#00843D" : T.barInactive }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: T.mockupCardBg, border:`1px solid ${T.mockupCardBrd}` }}>
                  <p className="text-[10px] mb-3" style={{ color: T.mockupText }}>Pipeline</p>
                  {["Prospect","Qualified","Proposal","Closing"].map((s, i) => (
                    <div key={s} className="mb-1.5">
                      <div className="flex justify-between text-[9px] mb-0.5" style={{ color: T.mockupText }}><span>{s}</span><span>{[85,64,42,18][i]}%</span></div>
                      <div className="h-1 rounded-full" style={{ background: T.mockupCardBrd }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${[85,64,42,18][i]}%` }}
                          transition={{ delay:1+i*0.1, duration:0.8, ease:"easeOut" }}
                          className="h-full rounded-full" style={{ background: greenGrad }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── LOGO MARQUEE ──────────────────────────────────────── */}
      <div className="py-10 overflow-hidden border-y transition-colors duration-300" style={{ borderColor: T.divider, background: dark ? "rgba(212,175,55,0.015)" : "rgba(0,0,0,0.02)" }}>
        <p className="text-center text-[11px] uppercase tracking-widest mb-7" style={{ color: T.text3 }}>Trusted by teams switching from</p>
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${T.bg}, transparent)` }} />
          <div className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to left, ${T.bg}, transparent)` }} />
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-14 whitespace-nowrap"
          >
            {[...BRAND_LOGOS, ...BRAND_LOGOS].map((logo, i) => (
              <div key={i} className="flex items-center gap-2 flex-shrink-0"
                style={{ color: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" }}>
                {logo.svg(1)}
                <span className="text-sm font-semibold" style={{ color: dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.28)" }}>
                  {logo.name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="py-24 transition-colors duration-300" style={{ background: T.statsBg }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s,i) => (
            <FadeIn key={s.label} delay={i*0.1}>
              <div className="text-5xl font-black mb-2" style={{ background: greenGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                <Counter end={s.value} suffix={s.suffix} decimals={s.decimals} />
              </div>
              <p className="text-sm" style={{ color: T.text2 }}>{s.label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="py-28 max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Everything You Need</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>One Platform. Infinite Growth.</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>Every tool your sales team needs, seamlessly integrated and beautifully designed.</p>
        </FadeIn>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f,i) => {
            const Icon = f.icon;
            return (
              <FadeIn key={f.title} delay={i*0.05}>
                <motion.div whileHover={{ y:-6, scale:1.02 }} transition={{ duration:0.22 }}
                  className="group rounded-2xl p-6 cursor-default transition-all"
                  style={{ border:`1px solid ${T.cardBorder}`, background: T.cardBg, backdropFilter: dark ? "none" : "blur(8px)" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardHoverBorder; el.style.background = T.cardHoverBg; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardBorder; el.style.background = T.cardBg; }}>
                  <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg", f.grad)}>
                    <Icon size={19} className="text-white" />
                  </div>
                  <h3 className="text-sm font-bold mb-2" style={{ color: T.text1 }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: T.text2 }}>{f.desc}</p>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
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

      {/* ── AI CAPABILITIES ──────────────────────────────────── */}
      <section className="py-28 max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>AI Sales Copilot</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>AI That Thinks Like Your<br />Best Sales Rep</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: T.text2 }}>6 powerful AI tools built directly into your CRM — no third-party subscriptions, no copy-pasting between apps.</p>
        </FadeIn>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {[
            { icon: Mail,      color:"#3b82f6", title:"AI Email Writer",        desc:"Generate personalized sales emails in one click. AI analyzes the lead's industry, deal stage, and past interactions to craft the perfect message." },
            { icon: MessageCircle, color:"#25D366", title:"AI WhatsApp Reply",  desc:"Suggest smart WhatsApp replies based on conversation context. Reply to 50 customers in the time it takes to write 5 manually." },
            { icon: FileText,  color:"#8b5cf6", title:"AI Meeting Notes",       desc:"Automatically transcribe and summarize meeting recordings. Extract action items, next steps, and key decisions — delivered to your CRM instantly." },
            { icon: Mic,       color:"#ef4444", title:"AI Call Summary",         desc:"Log calls and get an AI-generated summary with sentiment analysis, objection tracking, and recommended next actions within seconds." },
            { icon: Sparkles,  color:"#D4AF37", title:"AI Proposal Generator",  desc:"Generate professional, personalized proposals in minutes. AI pulls deal data, company research, and pricing to create compelling business proposals." },
            { icon: TrendingUp,color:"#00A86B", title:"AI Sales Forecast",       desc:"ML-powered revenue forecasting with confidence intervals. Predict next quarter's revenue based on pipeline quality, team performance, and seasonal trends." },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <FadeIn key={f.title} delay={i * 0.07}>
                <motion.div whileHover={{ y:-6 }} transition={{ duration:0.2 }}
                  className="rounded-2xl p-6 h-full transition-all"
                  style={{ border:`1px solid ${T.cardBorder}`, background: T.cardBg }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = f.color + "55"; el.style.background = f.color + "08"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardBorder; el.style.background = T.cardBg; }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: f.color + "18", border:`1px solid ${f.color}33` }}>
                      <Icon size={20} style={{ color: f.color }} />
                    </div>
                    <h3 className="text-sm font-bold" style={{ color: T.text1 }}>{f.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: T.text2 }}>{f.desc}</p>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
        {/* AI demo mockup */}
        <FadeIn>
          <div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: T.mockupBg, border:`1px solid ${T.mockupBorder}`, boxShadow: dark ? "0 32px 80px rgba(0,0,0,0.6)" : "0 20px 50px rgba(0,0,0,0.1)" }}>
            <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: T.mockupBorder, background: T.mockupCardBg }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#D4AF37,#F5C842)" }}>
                <Brain size={14} className="text-black" />
              </div>
              <span className="text-sm font-bold" style={{ color: T.text1 }}>KVl AI Copilot</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:"rgba(0,168,107,0.15)", color:"#00A86B", border:"1px solid rgba(0,168,107,0.25)" }}>Active</span>
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: T.mockupBorder }}>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:"#D4AF37" }}>AI Email Writer</p>
                <div className="rounded-xl p-4 mb-3 text-xs leading-relaxed" style={{ background: T.mockupCardBg, border:`1px solid ${T.mockupCardBrd}`, color: T.text2 }}>
                  <p className="font-semibold mb-1" style={{ color: T.text1 }}>Write email for: Priya Sharma, HealthAI Corp</p>
                  Deal stage: Proposal sent · Last contact: 5 days ago · Industry: Healthcare SaaS
                </div>
                <motion.div animate={{ opacity:[0.7,1,0.7] }} transition={{ duration:2, repeat:Infinity }}
                  className="rounded-xl p-4 text-xs leading-relaxed" style={{ background:`linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.02))`, border:"1px solid rgba(212,175,55,0.2)", color: T.text1 }}>
                  <p className="font-bold mb-2" style={{ color:"#D4AF37" }}>✨ AI Generated:</p>
                  Hi Priya, following up on the KVl proposal I sent last week. Given HealthAI's focus on patient relationship management, I wanted to highlight how our WhatsApp CRM has helped similar healthcare teams improve patient retention by 34%...
                </motion.div>
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:"#00A86B" }}>AI Sales Forecast</p>
                <div className="space-y-3">
                  {[["Q3 2025 Revenue","$1.24M","↑ High confidence","#00A86B"],["Pipeline at Risk","$180K","3 deals stalling","#f59e0b"],["Predicted Churn","2 accounts","Action needed","#ef4444"],["Upsell Opportunities","$95K","AI identified","#8b5cf6"]].map(([label,val,sub,col]) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: T.mockupCardBg, border:`1px solid ${T.mockupCardBrd}` }}>
                      <div>
                        <p className="text-[10px]" style={{ color: T.text2 }}>{label}</p>
                        <p className="text-sm font-black" style={{ color: T.text1 }}>{val}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: col + "18", color: col, border:`1px solid ${col}30` }}>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── PRODUCT SHOWCASE IMAGE ────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl"
            style={{ border:`1px solid rgba(212,175,55,0.2)`, boxShadow: dark ? "0 32px 80px rgba(0,0,0,0.6)" : "0 24px 60px rgba(0,0,0,0.12)" }}>
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80"
              alt="KVl CRM Dashboard"
              className="w-full object-cover"
              style={{ height:"420px", filter: dark ? "brightness(0.65) saturate(0.85)" : "brightness(0.85)" }}
            />
            {/* Overlay content */}
            <div className="absolute inset-0 flex items-end p-10"
              style={{ background:"linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)" }}>
              <div className="flex items-end justify-between w-full">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-bold"
                    style={{ background:"rgba(212,175,55,0.2)", border:"1px solid rgba(212,175,55,0.4)", color:"#D4AF37" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    Live Platform Preview
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white mb-2">Everything in One View</h3>
                  <p className="text-sm text-white/60 max-w-md">Real-time pipeline, revenue tracking, team performance — all visible at a glance.</p>
                </div>
                <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}
                  onClick={onGetStarted}
                  className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-black flex-shrink-0"
                  style={{ background: goldGrad, boxShadow:"0 4px 20px rgba(212,175,55,0.4)" }}>
                  Try It Free <ArrowRight size={14}/>
                </motion.button>
              </div>
            </div>
          </div>
        </FadeIn>
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

      {/* ── ANALYTICS ─────────────────────────────────────────── */}
      <section className="py-28 transition-colors duration-300" style={{ background: T.howBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Revenue Intelligence</span>
              <h2 className="text-4xl md:text-5xl font-black mt-3 mb-5" style={{ color: T.text1 }}>Data That Drives Decisions</h2>
              <p className="text-lg mb-8" style={{ color: T.text2 }}>Real-time dashboards, predictive forecasting, and deep pipeline analysis — so you always know what to do next.</p>
              <div className="space-y-5">
                {[
                  ["Revenue Forecasting","AI-powered quarterly and annual revenue predictions with confidence intervals."],
                  ["Pipeline Velocity","Track how fast deals move through each stage and identify where they stall."],
                  ["Team Performance","Individual rep metrics, quota attainment, and activity leaderboards."],
                  ["Conversion Analytics","Full-funnel conversion rates from lead source to closed-won deal."],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background:"rgba(0,132,61,0.15)" }}>
                      <Check size={11} style={{ color:"#00843D" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-0.5" style={{ color: T.text1 }}>{title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: T.text2 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="rounded-2xl p-6 shadow-2xl"
                style={{ background: T.mockupBg, border:`1px solid ${T.mockupBorder}`, boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 16px 40px rgba(0,0,0,0.1)" }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm font-bold" style={{ color: T.text1 }}>Revenue Forecast</p>
                    <p className="text-xs mt-0.5" style={{ color: T.text2 }}>Q4 2025 Projection</p>
                  </div>
                  <div className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={{ background:"rgba(0,132,61,0.15)", color:"#00A86B", border:"1px solid rgba(0,132,61,0.25)" }}>
                    ↑ 34% YoY
                  </div>
                </div>
                <div className="flex items-end gap-1.5 h-36 mb-3">
                  {[
                    {h:45,actual:true,l:"J"},{h:58,actual:true,l:"F"},{h:52,actual:true,l:"M"},
                    {h:71,actual:true,l:"A"},{h:67,actual:true,l:"M"},{h:84,actual:true,l:"J"},
                    {h:79,actual:true,l:"J"},{h:93,actual:true,l:"A"},{h:88,actual:false,l:"S"},
                    {h:102,actual:false,l:"O"},{h:98,actual:false,l:"N"},{h:115,actual:false,l:"D"},
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div initial={{ scaleY:0 }} animate={{ scaleY:1 }}
                        transition={{ delay:0.3+i*0.05, ease:"easeOut" }}
                        className="w-full rounded-t-sm origin-bottom"
                        style={{ height:`${bar.h * 0.9}%`, background: bar.actual ? "linear-gradient(to top,#006B3C,#00A86B)" : "linear-gradient(to top,rgba(212,175,55,0.25),rgba(212,175,55,0.5))", border: bar.actual ? "none" : "1px dashed rgba(212,175,55,0.4)" }} />
                      <span className="text-[8px]" style={{ color: T.text3 }}>{bar.l}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-[10px] mb-5" style={{ color: T.text2 }}>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block" style={{ background:"#00A86B" }}/> Actual</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block border border-dashed" style={{ background:"rgba(212,175,55,0.3)", borderColor:"rgba(212,175,55,0.5)" }}/> Forecast</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-5" style={{ borderTop:`1px solid ${T.mockupCardBrd}` }}>
                  {[["$4.2M","Projected ARR"],["68%","Win Rate"],["42d","Avg Sales Cycle"]].map(([val, label]) => (
                    <div key={label} className="text-center rounded-xl p-3" style={{ background: T.mockupCardBg }}>
                      <p className="text-base font-black" style={{ color: T.text1 }}>{val}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: T.text2 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
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

      {/* ── INTEGRATIONS ──────────────────────────────────────── */}
      <section className="py-28 max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Integrations</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Works With Your Entire Stack</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>Connect KVl with the tools your team already uses. One-click integrations, zero friction.</p>
        </FadeIn>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {integrations.map((int, i) => (
            <FadeIn key={int.name} delay={i*0.06}>
              <motion.div whileHover={{ y:-5, scale:1.02 }} transition={{ duration:0.2 }}
                className="rounded-2xl p-5 flex items-center gap-3 transition-all cursor-default"
                style={{ border:`1px solid ${T.cardBorder}`, background: T.cardBg }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardHoverBorder; el.style.background = T.cardHoverBg; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = T.cardBorder; el.style.background = T.cardBg; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border:`1px solid ${T.cardBorder}` }}>
                  {int.emoji}
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: T.text1 }}>{int.name}</p>
                  <p className="text-[10px]" style={{ color: T.text2 }}>{int.category}</p>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="text-center">
          <p className="text-sm" style={{ color: T.text2 }}>And 100+ more via Zapier, Make, and our open REST API.</p>
        </FadeIn>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      {appMode === "saas" && (
        <section id="pricing" className="py-28 transition-colors duration-300" style={{ background: T.pricingBg }}>
          <div className="max-w-5xl mx-auto px-6">
            <FadeIn className="text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color:"#D4AF37" }}>Transparent Pricing</span>
              <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4" style={{ color: T.text1 }}>Invest in Your Revenue</h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: T.text2 }}>Every plan includes a 14-day free trial. No credit card required.</p>
            </FadeIn>
            <FadeIn className="flex items-center justify-center gap-3 mb-14">
              <span className="text-sm" style={{ color: !billingAnnual ? T.text1 : T.text3 }}>Monthly</span>
              <button onClick={() => setBillingAnnual(!billingAnnual)} className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: billingAnnual ? "#D4AF37" : T.switchOff }}>
                <motion.div animate={{ x: billingAnnual ? 24 : 2 }} transition={{ type:"spring", stiffness:500, damping:30 }} className="absolute top-1 w-4 h-4 rounded-full bg-white" />
              </button>
              <span className="text-sm" style={{ color: billingAnnual ? T.text1 : T.text3 }}>Annual</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background:"rgba(212,175,55,0.15)", color:"#D4AF37", border:"1px solid rgba(212,175,55,0.3)" }}>Save 30%</span>
            </FadeIn>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((p,i) => (
                <FadeIn key={p.name} delay={i*0.08}>
                  <motion.div whileHover={{ y:-8 }} transition={{ duration:0.22 }}
                    className="relative rounded-2xl p-6 transition-all h-full flex flex-col"
                    style={{
                      border: p.popular ? "1px solid rgba(212,175,55,0.45)" : `1px solid ${T.pricingCardBrd}`,
                      background: p.popular ? T.pricingPopBg : T.pricingCardBg,
                      boxShadow: p.popular ? T.pricingPopShadow : "none",
                      backdropFilter: dark ? "none" : "blur(8px)",
                    }}>
                    {p.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1 text-[11px] font-black rounded-full text-black" style={{ background: goldGrad }}>Most Popular</span>
                      </div>
                    )}
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: p.popular ? "#D4AF37" : T.text2 }}>{p.name}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      {(p as any).custom
                        ? <span className="text-3xl font-black" style={{ color: T.text1 }}>Custom</span>
                        : <><span className="text-4xl font-black" style={{ color: T.text1 }}>${billingAnnual ? Math.floor(p.price*0.7) : p.price}</span><span className="text-sm" style={{ color: T.text2 }}>/mo</span></>
                      }
                    </div>
                    <ul className="space-y-2.5 mb-7 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs" style={{ color: T.text2 }}>
                          <Check size={13} style={{ color:"#00843D", flexShrink:0 }} />{f}
                        </li>
                      ))}
                    </ul>
                    <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                      onClick={onGetStarted}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-auto"
                      style={p.popular
                        ? { background: goldGrad, color:"#000", boxShadow:"0 4px 20px rgba(212,175,55,0.3)" }
                        : { border:`1px solid ${T.cardBorder}`, background: T.cardBg, color: T.text2 }}>
                      {p.cta}
                    </motion.button>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: goldGrad }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-black text-sm" style={{ background: goldGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>KVl CRM</span>
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
                      { key:"name",    placeholder:"Your Full Name",    type:"text" },
                      { key:"email",   placeholder:"Work Email",         type:"email" },
                      { key:"company", placeholder:"Company Name",       type:"text" },
                    ].map(f => (
                      <input key={f.key} type={f.type} placeholder={f.placeholder}
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
                    onClick={() => { if (demoForm.name && demoForm.email) setDemoSent(true); }}
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
                  <motion.button whileHover={{ scale:1.03 }} onClick={() => { setDemoOpen(false); setDemoSent(false); onGetStarted(); }}
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
