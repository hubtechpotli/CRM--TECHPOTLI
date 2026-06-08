import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  action,
  actionHref,
  children,
  className,
  noPadding,
}: {
  title?: string;
  action?: string;
  actionHref?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        className,
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {title ? (
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {action && actionHref ? (
            <Link href={actionHref} className="text-xs font-medium text-primary hover:underline">
              {action}
            </Link>
          ) : action ? (
            <span className="text-xs font-medium text-primary">{action}</span>
          ) : null}
        </div>
      ) : null}
      <div className={noPadding ? undefined : "p-5"}>{children}</div>
    </div>
  );
}
