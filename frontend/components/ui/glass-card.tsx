import { cn } from "@/lib/utils";

/** @deprecated Prefer SectionCard — kept for gradual migration; styles now match design system */
export function GlassCard({
  children,
  className,
  noPadding,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  /** Skip default body padding — inner content must use at least p-5 md:px-6 */
  noPadding?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-sm",
        !noPadding && (compact ? "crm-card-padding-compact" : "crm-card-padding"),
        className,
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {children}
    </div>
  );
}
