"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  CircleDot,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Server,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, formatLabel } from "@/lib/format";
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
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["customer-timeline", customerId],
    queryFn: async () => {
      const res = await api.get<TimelineEvent[]>(`/customers/${customerId}/timeline`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

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
    </div>
  );
}
