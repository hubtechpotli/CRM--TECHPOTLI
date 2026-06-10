"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Briefcase,
  CircleDot,
  FileText,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Server,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, formatLabel } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, normalizePaginated } from "@/lib/pagination";
import { GlassCard } from "@/components/ui/glass-card";
import { UserAvatar } from "@/components/ui/user-avatar";

type TimelineEvent = Record<string, unknown> & {
  user?: { name?: string };
};

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CUSTOMER_CREATED: User,
  PROJECT_CREATED: Briefcase,
  PROJECT_COMPLETED: Briefcase,
  PROJECT_UPDATE: MessageSquare,
  PROJECT_STATUS_CHANGED: CircleDot,
  WORK_ITEM_CREATED: MessageSquare,
  WORK_ITEM_UPDATED: MessageSquare,
  WORK_ITEM_COMPLETED: MessageSquare,
  NOTE_ADDED: MessageSquare,
  DOCUMENT_UPLOADED: FileText,
  CALL_LOGGED: Phone,
  DOMAIN_ADDED: Globe,
  HOSTING_ADDED: Server,
  EMAIL_SENT: Mail,
};

export function CustomerTimelinePanel({ customerId }: { customerId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["customer-timeline", customerId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await api.get(`/customers/${customerId}/timeline`, {
        params: {
          limit: DEFAULT_PAGE_SIZE,
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      return normalizePaginated<TimelineEvent>(res.data);
    },
    getNextPageParam: (last) => (last.hasMore && last.nextCursor ? last.nextCursor : undefined),
  });

  const events = data?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading timeline…</p>;
  }

  if (!events.length) {
    return <p className="text-sm text-muted-foreground">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const Icon = EVENT_ICONS[String(event.eventType ?? "")] ?? CircleDot;
        return (
          <GlassCard key={String(event.id)}>
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{String(event.title ?? "Event")}</p>
                    {event.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {String(event.description)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
                      {formatLabel(String(event.eventType ?? ""))}
                    </span>
                    <p className="mt-1">{formatDateTime(event.createdAt)}</p>
                  </div>
                </div>
                {event.user?.name ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <UserAvatar name={event.user.name} size="sm" />
                    <span>{event.user.name}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </GlassCard>
        );
      })}
      {hasNextPage ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
