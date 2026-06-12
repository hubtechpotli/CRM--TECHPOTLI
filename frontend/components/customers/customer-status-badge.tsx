"use client";

import { cn } from "@/lib/utils";
import { customerStatusBadgeClass, customerStatusLabel } from "@/lib/customer-status";

export function CustomerStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
        customerStatusBadgeClass(status),
        className,
      )}
    >
      {customerStatusLabel(status)}
    </span>
  );
}
