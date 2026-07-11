"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Shield, Palette, Globe, Key, Zap, Database, ChevronRight, ChevronDown, Check, Copy, Eye, EyeOff, Moon, Sun, Building2, Lock, Layers, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";

type ProfileForm = { name: string; email: string; phone: string; role: string };

const INITIAL_PROFILE: ProfileForm = {
  name: "Animesh",
  email: "animesh@freedomwithai.com",
  phone: "+1 555-0100",
  role: "Admin",
};

const notifSettings = [
  { label: "New Lead Assigned", key: "newLead" },
  { label: "Deal Stage Changed", key: "dealStage" },
  { label: "Task Due Reminder", key: "taskDue" },
  { label: "Invoice Overdue", key: "invoiceOverdue" },
  { label: "Team Mentions", key: "mentions" },
];

const connectedApps = [
  { name: "Slack", connected: true, color: "#4A154B" },
  { name: "Gmail", connected: true, color: "#D44638" },
  { name: "WhatsApp", connected: true, color: "#25D366" },
  { name: "Stripe", connected: false, color: "#635BFF" },
];

export default function Settings() {
  const [profile, setProfile] = useState<ProfileForm>(INITIAL_PROFILE);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ProfileForm>(INITIAL_PROFILE);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ newLead: true, dealStage: true, taskDue: true, invoiceOverdue: false, mentions: true });
  const [apps, setApps] = useState(connectedApps);
  const [apiVisible, setApiVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const apiKey = "sk-crm-freedomwithai-••••••••••••••••••••";
  const apiKeyFull = "sk-crm-freedomwithai-x9Kp2mNqRtYuVwZs8jLd";

  const saveProfile = () => {
    setProfile(editForm);
    setEditOpen(false);
  };

  const copyKey = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleApp = (name: string) => {
    setApps((prev) => prev.map((a) => a.name === name ? { ...a, connected: !a.connected } : a));
  };

  const toggle = (key: string) => setExpanded((p) => p === key ? null : key);

  const settingsSections = [
    {
      label: "Account",
      items: [
        {
          icon: User, title: "Profile Settings", desc: "Manage your personal info",
          content: (
            <div className="space-y-2 pt-2 pb-1">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-slate-500 mb-1">Name</p><p className="text-xs text-slate-300">{profile.name}</p></div>
                <div><p className="text-[10px] text-slate-500 mb-1">Email</p><p className="text-xs text-slate-300">{profile.email}</p></div>
                <div><p className="text-[10px] text-slate-500 mb-1">Phone</p><p className="text-xs text-slate-300">{profile.phone}</p></div>
                <div><p className="text-[10px] text-slate-500 mb-1">Role</p><p className="text-xs text-slate-300">{profile.role}</p></div>
              </div>
              <button onClick={() => { setEditForm(profile); setEditOpen(true); }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Edit Profile →</button>
            </div>
          ),
        },
        {
          icon: Shield, title: "Security", desc: "Password, 2FA, and sessions",
          content: (
            <div className="space-y-2 pt-2 pb-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">Two-Factor Authentication</p>
                  <p className="text-[10px] text-slate-500">Enabled via Authenticator App</p>
                </div>
                <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
              </div>
              <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Change Password →</button>
            </div>
          ),
        },
        {
          icon: Key, title: "API Keys", desc: "Manage API access tokens",
          content: (
            <div className="space-y-2 pt-2 pb-1">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-crm-border">
                <code className="text-xs text-slate-400 flex-1 font-mono truncate">
                  {apiVisible ? apiKeyFull : apiKey}
                </code>
                <button onClick={() => setApiVisible((v) => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {apiVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button onClick={copyKey} className="text-slate-500 hover:text-blue-400 transition-colors">
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-600">Keep your API key secure. Do not share it publicly.</p>
            </div>
          ),
        },
      ],
    },
    {
      label: "Workspace",
      items: [
        {
          icon: Globe, title: "Workspace Settings", desc: "Company info and branding",
          content: (
            <div className="grid grid-cols-2 gap-2 pt-2 pb-1">
              <div><p className="text-[10px] text-slate-500 mb-1">Company</p><p className="text-xs text-slate-300">FreedomWithAI</p></div>
              <div><p className="text-[10px] text-slate-500 mb-1">Plan</p><p className="text-xs text-violet-400">Pro Plan</p></div>
              <div><p className="text-[10px] text-slate-500 mb-1">Members</p><p className="text-xs text-slate-300">5 / 10</p></div>
              <div><p className="text-[10px] text-slate-500 mb-1">Region</p><p className="text-xs text-slate-300">US East</p></div>
            </div>
          ),
        },
        {
          icon: Bell, title: "Notifications", desc: "Email, push, and in-app alerts",
          content: (
            <div className="space-y-2 pt-2 pb-1">
              {notifSettings.map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between">
                  <p className="text-xs text-slate-300">{label}</p>
                  <button
                    onClick={() => setNotifs((p) => ({ ...p, [key]: !p[key] }))}
                    className={cn("w-9 h-5 rounded-full transition-colors relative flex-shrink-0", notifs[key] ? "bg-blue-500" : "bg-white/[0.1]")}
                  >
                    <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", notifs[key] ? "left-4.5 translate-x-0.5" : "left-0.5")} style={{ left: notifs[key] ? "calc(100% - 18px)" : "2px" }} />
                  </button>
                </div>
              ))}
            </div>
          ),
        },
        {
          icon: Palette, title: "Appearance", desc: "Theme, colors, and layout",
          content: (
            <div className="space-y-2 pt-2 pb-1">
              <p className="text-[10px] text-slate-500">Theme</p>
              <div className="flex gap-2">
                <button onClick={() => setDarkMode(true)} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all", darkMode ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-crm-border text-slate-400 hover:bg-white/[0.04]")}>
                  <Moon size={12} /> Dark
                </button>
                <button onClick={() => setDarkMode(false)} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all", !darkMode ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-crm-border text-slate-400 hover:bg-white/[0.04]")}>
                  <Sun size={12} /> Light
                </button>
              </div>
              <p className="text-[10px] text-slate-600">{darkMode ? "Dark mode active" : "Light mode — coming soon"}</p>
            </div>
          ),
        },
      ],
    },
    {
      label: "Integrations",
      items: [
        {
          icon: Zap, title: "Integrations", desc: "Connect with third-party tools",
          content: (
            <div className="grid grid-cols-2 gap-2 pt-2 pb-1">
              {apps.map((app) => (
                <div key={app.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-crm-border">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: app.color + "40" }}>
                      {app.name[0]}
                    </div>
                    <span className="text-xs text-slate-300">{app.name}</span>
                  </div>
                  <button
                    onClick={() => toggleApp(app.name)}
                    className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all", app.connected ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 hover:text-blue-400")}
                  >
                    {app.connected ? "Connected" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          ),
        },
        {
          icon: Database, title: "Data & Privacy", desc: "Data retention and export",
          content: (
            <div className="space-y-2 pt-2 pb-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">Data Retention</p>
                <span className="text-xs text-slate-400">12 months</span>
              </div>
              <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Export all data →</button>
              <button className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Delete account data →</button>
            </div>
          ),
        },
      ],
    },
    {
      label: "Enterprise",
      items: [
        {
          icon: LogIn, title: "SSO / Single Sign-On", desc: "Configure SAML, Google, or Microsoft SSO",
          content: (
            <div className="space-y-3 pt-2 pb-1">
              <p className="text-[10px] text-slate-500">Enable SSO to let your team log in with your company identity provider.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name:"Google Workspace", color:"#4285F4", letter:"G", active: true },
                  { name:"Microsoft Azure",  color:"#0078D4", letter:"M", active: false },
                  { name:"Okta SAML",        color:"#007DC1", letter:"O", active: false },
                ].map(p => (
                  <div key={p.name} className={cn("rounded-xl p-3 text-center border transition-all cursor-pointer",
                    p.active ? "border-blue-500/40 bg-blue-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]")}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 text-xs font-black text-white"
                      style={{ background: p.color + "40" }}>{p.letter}</div>
                    <p className="text-[9px] text-slate-300 leading-tight">{p.name}</p>
                    {p.active && <span className="text-[9px] text-emerald-400 font-semibold">Active</span>}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {[["SSO Domain","freedomwithai.com"],["Callback URL","app.kvlcrm.com/auth/sso"],["Entity ID","kvl-crm-prod"]].map(([k,v]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-[10px] text-slate-500">{k}</span>
                    <span className="text-[10px] text-slate-300 font-mono">{v}</span>
                  </div>
                ))}
              </div>
              <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white" style={{ background:"linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                Configure SSO →
              </button>
            </div>
          ),
        },
        {
          icon: Layers, title: "White Label", desc: "Custom branding — logo, domain, colors",
          content: (
            <div className="space-y-3 pt-2 pb-1">
              <p className="text-[10px] text-slate-500">Replace KVl branding with your own. Available on Enterprise plan.</p>
              <div className="space-y-2">
                {[
                  { label:"Custom Domain",    placeholder:"crm.yourdomain.com",  val:"" },
                  { label:"Brand Name",       placeholder:"Your CRM Name",       val:"" },
                  { label:"Support Email",    placeholder:"support@company.com", val:"" },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[10px] text-slate-500 mb-1">{f.label}</p>
                    <input placeholder={f.placeholder} className="w-full px-3 py-2 rounded-xl text-xs bg-white/[0.04] border border-white/[0.07] text-slate-200 outline-none placeholder-slate-600 focus:border-amber-500/40" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 rounded-lg border border-white/[0.07] flex items-center px-3 gap-2">
                  <div className="w-4 h-4 rounded" style={{ background:"#D4AF37" }} />
                  <span className="text-[10px] text-slate-400">Primary Color</span>
                </div>
                <div className="flex-1 h-8 rounded-lg border border-white/[0.07] flex items-center px-3 gap-2">
                  <div className="w-4 h-4 rounded" style={{ background:"#00A86B" }} />
                  <span className="text-[10px] text-slate-400">Accent Color</span>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-black" style={{ background:"linear-gradient(135deg,#D4AF37,#F5C842)" }}>
                Apply White Label →
              </button>
            </div>
          ),
        },
        {
          icon: Building2, title: "Multi-Workspace", desc: "Manage multiple companies or departments",
          content: (
            <div className="space-y-3 pt-2 pb-1">
              <p className="text-[10px] text-slate-500">Switch between workspaces without logging out. Each workspace has isolated data.</p>
              <div className="space-y-2">
                {[
                  { name:"FreedomWithAI — Main",   plan:"Enterprise", active: true },
                  { name:"Demo Environment",        plan:"Growth",     active: false },
                  { name:"Client Portal — Beta",    plan:"Starter",    active: false },
                ].map(ws => (
                  <div key={ws.name} className={cn("flex items-center justify-between p-3 rounded-xl border transition-all",
                    ws.active ? "border-amber-500/30 bg-amber-500/05" : "border-white/[0.06] bg-white/[0.02]")}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black"
                        style={{ background: ws.active ? "linear-gradient(135deg,#D4AF37,#F5C842)" : "rgba(255,255,255,0.1)" }}>
                        {ws.name[0]}
                      </div>
                      <div>
                        <p className="text-xs text-slate-200 font-medium">{ws.name}</p>
                        <p className="text-[9px] text-slate-500">{ws.plan}</p>
                      </div>
                    </div>
                    {ws.active
                      ? <span className="text-[10px] text-amber-400 font-bold">Current</span>
                      : <button className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold transition-colors">Switch →</button>}
                  </div>
                ))}
              </div>
              <button className="w-full py-2 rounded-xl text-[10px] font-semibold text-slate-400 border border-dashed border-white/[0.08] hover:border-white/[0.15] transition-colors">
                + Add New Workspace
              </button>
            </div>
          ),
        },
      ],
    },
  ];

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-5">
        {/* Profile Card */}
        <div className="glass-card rounded-2xl border border-crm-border p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-xl font-bold text-white neon-blue">
            {profile.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-100">{profile.name} (Admin)</h3>
            <p className="text-xs text-slate-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge bg-violet-500/10 text-violet-400 border border-violet-500/20">Pro Plan</span>
              <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Admin</span>
              <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">FreedomWithAI</span>
            </div>
          </div>
          <button onClick={() => { setEditForm(profile); setEditOpen(true); }} className="px-4 py-2 rounded-xl gradient-bg text-white text-xs">Edit Profile</button>
        </div>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">{section.label}</p>
            <div className="space-y-1.5">
              {section.items.map((item, i) => {
                const Icon = item.icon;
                const isOpen = expanded === item.title;
                return (
                  <div key={item.title}>
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => toggle(item.title)}
                      className={cn("w-full glass-card rounded-xl border p-3.5 flex items-center gap-3 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all text-left group", isOpen ? "border-blue-500/30 bg-white/[0.04] rounded-b-none" : "border-crm-border")}
                    >
                      <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center transition-all", isOpen ? "gradient-bg border-transparent" : "bg-white/[0.05] border-crm-border group-hover:gradient-bg group-hover:border-transparent")}>
                        <Icon size={16} className={cn("transition-colors", isOpen ? "text-white" : "text-slate-400 group-hover:text-white")} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      {isOpen ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />}
                    </motion.button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="glass-card rounded-b-xl border border-t-0 border-blue-500/30 px-4 py-3">
                            {item.content}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Profile Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Full Name</label>
              <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Role</label>
              <input className={inputCls} value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Email</label>
            <input className={inputCls} type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Phone</label>
            <input className={inputCls} value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Cancel</button>
            <button onClick={saveProfile} className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium">Save Changes</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
