import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Assignee } from "@/lib/types";

export function useAssignees() {
  return useQuery({
    queryKey: ["users-assignees"],
    queryFn: async () => {
      const res = await api.get<Assignee[]>("/users/assignees");
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60_000,
  });
}
