import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormSection({
  title,
  description,
  icon: Icon,
  accent: _accent = "indigo",
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** @deprecated Accent is ignored — sections use neutral styling */
  accent?: "indigo" | "cyan" | "amber" | "emerald" | "rose";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 border-b border-border/80 bg-muted/30 px-4 py-3">
        {Icon ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}
