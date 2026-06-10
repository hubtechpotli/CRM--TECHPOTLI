import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FeatureColor } from "@/lib/feature-colors";

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  actionHref,
  children,
  className,
  noPadding,
  compact,
  headerClassName,
  accent,
}: {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: string;
  actionHref?: string;
  children: React.ReactNode;
  className?: string;
  /** Inner content must use at least p-5 md:px-6 */
  noPadding?: boolean;
  compact?: boolean;
  headerClassName?: string;
  accent?: FeatureColor;
}) {
  const color = accent;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        color?.border ?? "border-border",
        className,
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {color ? (
        <div className={cn("h-0.5 w-full", color.solid)} aria-hidden />
      ) : null}
      {title ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b",
            color?.border ?? "border-border/50",
            color?.light,
            compact ? "px-4 py-3" : "px-6 py-4",
            headerClassName,
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
                  color?.solid ?? "bg-primary",
                  compact ? "h-7 w-7" : "h-9 w-9",
                )}
              >
                <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </div>
            ) : null}
            <div className="min-w-0">
              <h3 className={cn("text-sm font-semibold", color?.text ?? "text-foreground")}>
                {title}
              </h3>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {action && actionHref ? (
            <Link
              href={actionHref}
              className={cn(
                "shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition",
                color ? cn(color.text, color.hoverBg) : "text-primary hover:bg-primary/5",
              )}
            >
              {action}
            </Link>
          ) : action ? (
            <span className={cn("shrink-0 text-xs font-medium", color?.text ?? "text-primary")}>
              {action}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={
          noPadding ? undefined : compact ? "crm-card-padding-compact" : "crm-card-padding"
        }
      >
        {children}
      </div>
    </div>
  );
}
