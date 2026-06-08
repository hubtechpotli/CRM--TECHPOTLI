import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/40 bg-white/75 p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-md transition dark:border-white/10 dark:bg-slate-900/55 dark:shadow-cyan-500/5",
        className
      )}
    >
      {children}
    </div>
  );
}
