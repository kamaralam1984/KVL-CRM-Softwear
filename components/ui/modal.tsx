"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, wide }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full outline-none px-4",
            wide ? "max-w-lg" : "max-w-md"
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="glass-card rounded-2xl border border-crm-border p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-sm font-semibold text-slate-100">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-7 h-7 rounded-lg bg-white/[0.05] border border-crm-border flex items-center justify-center hover:bg-white/[0.09] transition-colors">
                  <X size={13} className="text-slate-400" />
                </button>
              </Dialog.Close>
            </div>
            {children}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
