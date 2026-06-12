"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { api } from "@/lib/api";
import { patchDetailItem } from "@/lib/optimistic-mutation";
import {
  CUSTOMER_STATUSES,
  confirmCustomerStatusChange,
  type CustomerStatusValue,
} from "@/lib/customer-status";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { SelectInput } from "@/components/ui/form-field";

export function CustomerStatusSelect({
  customerId,
  status,
  compact = false,
}: {
  customerId: string;
  status: string | null | undefined;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const current = (status ?? "ACTIVE") as CustomerStatusValue;
  const customerKey = ["customer", customerId] as const;

  const mutation = useOptimisticMutation({
    mutationFn: async (next: CustomerStatusValue) => {
      const res = await api.patch(`/customers/${customerId}`, { status: next });
      return res.data;
    },
    snapshotKeys: [customerKey, ["customers-directory"]],
    invalidateKeys: [customerKey, ["customers-directory"]],
    onMutate: (next) => {
      patchDetailItem(queryClient, customerKey, { status: next });
    },
  });

  function handleChange(next: string) {
    const value = next as CustomerStatusValue;
    if (!CUSTOMER_STATUSES.some((s) => s.value === value)) return;
    if (!confirmCustomerStatusChange(value, current)) return;
    mutation.mutate(value);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <CustomerStatusBadge status={current} />
        <SelectInput
          value={current}
          onChange={handleChange}
          options={CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          disabled={mutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <SelectInput
        value={current}
        onChange={handleChange}
        options={CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        disabled={mutation.isPending}
      />
      <p className="text-xs text-muted-foreground">{CUSTOMER_STATUSES.find((s) => s.value === current)?.hint}</p>
    </div>
  );
}
