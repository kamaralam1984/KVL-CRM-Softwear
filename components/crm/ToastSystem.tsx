"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info" | "ai";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  ai: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const toastConfig: Record<ToastType, { icon: React.ElementType; bg: string; border: string; iconColor: string; iconBg: string }> = {
  success: { icon: Check,          bg: "bg-[#0d1424]", border: "border-emerald-500/30", iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10" },
  error:   { icon: X,              bg: "bg-[#0d1424]", border: "border-rose-500/30",    iconColor: "text-rose-400",    iconBg: "bg-rose-500/10" },
  warning: { icon: AlertTriangle,  bg: "bg-[#0d1424]", border: "border-amber-500/30",   iconColor: "text-amber-400",   iconBg: "bg-amber-500/10" },
  info:    { icon: Info,           bg: "bg-[#0d1424]", border: "border-blue-500/30",    iconColor: "text-blue-400",    iconBg: "bg-blue-500/10" },
  ai:      { icon: Sparkles,       bg: "bg-[#0d1424]", border: "border-violet-500/30",  iconColor: "text-violet-400",  iconBg: "bg-violet-500/10" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
    if (timers.current[id]) clearTimeout(timers.current[id]);
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { ...t, id }]);
    const dur = t.duration ?? 4000;
    timers.current[id] = setTimeout(() => dismiss(id), dur);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ type: "success", title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: "error",   title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: "warning", title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: "info",    title, message }), [toast]);
  const ai      = useCallback((title: string, message?: string) => toast({ type: "ai",      title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, ai }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const cfg = toastConfig[t.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl min-w-[280px] max-w-[380px]",
                  cfg.bg, cfg.border
                )}
                style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", cfg.iconBg)}>
                  <Icon size={14} className={cfg.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{t.title}</p>
                  {t.message && <p className="text-xs text-slate-500 mt-0.5">{t.message}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="text-slate-600 hover:text-slate-400 transition-colors mt-0.5">
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
