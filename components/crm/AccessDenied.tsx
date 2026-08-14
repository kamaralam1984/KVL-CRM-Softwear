"use client";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

interface AccessDeniedProps {
  section: string;
  role: string;
}

export default function AccessDenied({ section, role }: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[70vh] p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 mx-auto"
          style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}
        >
          <ShieldAlert size={32} className="text-rose-400" />
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-400 mb-1">
          Your role — <span className="font-bold text-rose-400">{role}</span> — doesn&apos;t have permission to view{" "}
          <span className="font-bold text-slate-200">{section}</span>.
        </p>
        <p className="text-xs text-slate-600 mt-6">Contact your Admin or Super Admin to request access.</p>
      </motion.div>
    </div>
  );
}
