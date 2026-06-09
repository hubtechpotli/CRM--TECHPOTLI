"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AuthCardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 bg-white/90 p-8 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-indigo-500/5 before:via-transparent before:to-cyan-500/5",
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
