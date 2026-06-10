import { cn } from "@/lib/utils";

/** @deprecated Prefer SectionCard — kept for gradual migration; styles now match design system */
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
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        className,
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {children}
    </div>
  );
}
