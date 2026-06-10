import type { QueryClient } from "@tanstack/react-query";

export type TeamUpdatesSummary = {
  openTotal: number;
  assignedToMe: number;
  unassignedOpen: number;
  newToday: number;
};

export type GlobalWorkItem = Record<string, unknown> & {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
  createdBy?: { id?: string; name?: string };
  assignedTo?: { id?: string; name?: string };
  project?: { id?: string; name?: string };
  customer?: { id?: string; companyName?: string };
  updates?: Array<Record<string, unknown> & { body?: string; author?: { name?: string }; createdAt?: string }>;
};

export type TeamFeedResponse = {
  data: GlobalWorkItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export function invalidateTeamUpdates(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["team-updates-summary"] });
  queryClient.invalidateQueries({ queryKey: ["team-updates-feed"] });
}

/** Instant UI bump after posting — reconciled on background invalidate. */
export function optimisticBumpTeamSummary(
  queryClient: QueryClient,
  opts: { assignedToId?: string; currentUserId?: string },
) {
  queryClient.setQueryData<TeamUpdatesSummary>(["team-updates-summary"], (old) => {
    if (!old) return old;
    const mine = opts.assignedToId && opts.assignedToId === opts.currentUserId;
    return {
      openTotal: old.openTotal + 1,
      assignedToMe: mine ? old.assignedToMe + 1 : old.assignedToMe,
      unassignedOpen: !opts.assignedToId ? old.unassignedOpen + 1 : old.unassignedOpen,
      newToday: old.newToday + 1,
    };
  });
}
