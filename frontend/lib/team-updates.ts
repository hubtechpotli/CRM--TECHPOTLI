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
