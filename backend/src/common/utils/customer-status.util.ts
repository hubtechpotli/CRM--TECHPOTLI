import { CustomerStatus } from '@prisma/client';

const LABELS: Record<CustomerStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  CHURNED: 'Completely closed', // UI: services ended; customer may return — set Active again
};

export function customerStatusDisplayLabel(status: CustomerStatus | string): string {
  return LABELS[status as CustomerStatus] ?? String(status);
}
