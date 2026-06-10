import { ForbiddenException } from '@nestjs/common';
import { LeadStatus, Prisma, UserRole } from '@prisma/client';

export type LeadAccessUser = {
  role: string;
  userId: string;
};

export type LeadScopeFilters = {
  status?: LeadStatus;
  assignedToId?: string;
};

export function isLeadAdmin(role: string) {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function buildLeadWhere(
  role: string,
  userId: string,
  filters?: LeadScopeFilters,
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (filters?.status) where.status = filters.status;

  if (isLeadAdmin(role)) {
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    return where;
  }

  // Employees only see leads assigned to them
  where.assignedToId = userId;
  return where;
}

type LeadRecord = {
  assignedToId?: string | null;
};

export function assertCanReadLead(lead: LeadRecord, role: string, userId: string) {
  if (isLeadAdmin(role)) return;
  if (lead.assignedToId !== userId) {
    throw new ForbiddenException('You do not have access to this lead');
  }
}

export function assertCanWriteLead(lead: LeadRecord, role: string, userId: string) {
  if (isLeadAdmin(role)) return;
  if (lead.assignedToId !== userId) {
    throw new ForbiddenException('You can only edit your own leads');
  }
}

export function assertCanAssign(role: string) {
  if (!isLeadAdmin(role)) {
    throw new ForbiddenException('Only admins can assign leads');
  }
}

export function assertCanDelete(role: string) {
  if (role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenException('Only super admins can delete leads');
  }
}
