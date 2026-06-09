"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { moveKanbanCard } from "@/lib/optimistic-mutation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Link from "next/link";
import { Calendar, Phone, User } from "lucide-react";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { LEAD_STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getStatusMeta, isFollowUpOverdue } from "@/lib/lead-ui";
import {
  CompanyAvatar,
  LeadAiScoreBadge,
  LeadPriorityBadge,
} from "@/components/leads/lead-badges";

type Lead = Record<string, unknown> & {
  id: string;
  assignedTo?: { name?: string };
  aiScore?: number | null;
  aiScoreReason?: string | null;
};

const STATUSES = LEAD_STATUSES;

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[280px] shrink-0 space-y-3">
          <div className="h-6 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2 rounded-xl border border-border/40 p-2">
            {Array.from({ length: 2 }).map((__, j) => (
              <div key={j} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadCard({
  lead,
  isDragging,
  showSalesPerson,
}: {
  lead: Lead;
  isDragging?: boolean;
  showSalesPerson?: boolean;
}) {
  const overdue = isFollowUpOverdue(lead.followUpDate);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-white/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900/60",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyAvatar name={String(lead.companyName ?? "?")} className="h-8 w-8 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {String(lead.companyName ?? "—")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {String(lead.contactName ?? "")}
          </p>
        </div>
      </div>

      {lead.phone ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{String(lead.phone)}</span>
        </div>
      ) : null}

      {showSalesPerson && lead.assignedTo?.name ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.assignedTo.name}</span>
        </div>
      ) : null}

      {lead.followUpDate ? (
        <div
          className={cn(
            "mt-1.5 flex items-center gap-1.5 text-[11px]",
            overdue ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground",
          )}
        >
          <Calendar className="h-3 w-3 shrink-0" />
          {new Date(String(lead.followUpDate)).toLocaleDateString()}
          {overdue ? " · Overdue" : ""}
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-1">
        {lead.priority ? <LeadPriorityBadge priority={String(lead.priority)} /> : null}
        {typeof lead.aiScore === "number" ? (
          <LeadAiScoreBadge score={lead.aiScore} reason={lead.aiScoreReason} />
        ) : null}
      </div>
    </div>
  );
}

function DraggableLeadCard({ lead, showSalesPerson }: { lead: Lead; showSalesPerson?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(lead.id) });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <Link href={`/leads/${lead.id}`} onClick={(e) => isDragging && e.preventDefault()} draggable={false}>
        <LeadCard lead={lead} isDragging={isDragging} showSalesPerson={showSalesPerson} />
      </Link>
    </div>
  );
}

function KanbanColumn({
  status,
  leads,
  showSalesPerson,
}: {
  status: string;
  leads: Lead[];
  showSalesPerson?: boolean;
}) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  const isEndColumn = status === "WON" || status === "LOST";
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="w-[280px] shrink-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", meta.bg)}>
            <Icon className={cn("h-3.5 w-3.5", meta.text)} />
          </div>
          <h3 className="text-xs font-semibold text-foreground">{meta.label}</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            meta.bg,
            meta.text,
          )}
        >
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[160px] space-y-2 rounded-xl border p-2 transition",
          meta.columnBg,
          isEndColumn ? "border-dashed opacity-90" : "border-border/40",
          isOver && "ring-2 ring-primary/25",
        )}
      >
        <div className={cn("mb-1 h-0.5 rounded-full", meta.columnAccent)} />
        {leads.map((lead) => (
          <DraggableLeadCard key={String(lead.id)} lead={lead} showSalesPerson={showSalesPerson} />
        ))}
        {leads.length === 0 ? (
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
            Drop leads here
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LeadKanban({ showSalesPerson = false }: { showSalesPerson?: boolean }) {
  const queryClient = useQueryClient();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["leads-kanban"],
    queryFn: async () => {
      const res = await api.get<Record<string, Lead[]>>("/leads/kanban");
      return res.data;
    },
  });

  const statusMutation = useOptimisticMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const res = await api.patch(`/leads/${leadId}`, { status });
      return res.data;
    },
    snapshotKeys: [["leads-kanban"]],
    invalidateKeys: [["leads-kanban"], ["leads"]],
    errorMessage: "Could not move lead. Reverted.",
    onMutate: ({ leadId, status }) => {
      const found = findLead(leadId);
      if (found) {
        moveKanbanCard(queryClient, ["leads-kanban"], leadId, found.status, status, STATUSES);
      }
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function findLead(id: string): { lead: Lead; status: string } | null {
    if (!data) return null;
    for (const status of STATUSES) {
      const lead = (data[status] ?? []).find((l) => String(l.id) === id);
      if (lead) return { lead, status };
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const found = findLead(String(event.active.id));
    setActiveLead(found?.lead ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const newStatus = String(over.id);
    const found = findLead(leadId);
    if (!found || found.status === newStatus) return;
    if (!STATUSES.includes(newStatus as (typeof STATUSES)[number])) return;

    statusMutation.mutate({ leadId, status: newStatus });
  }

  if (isLoading) {
    return (
      <GlassCard>
        <KanbanSkeleton />
      </GlassCard>
    );
  }

  if (error) {
    const message =
      error && typeof error === "object" && "response" in error
        ? String(
            (error as { response?: { status?: number } }).response?.status === 403
              ? "You do not have access to these leads"
              : "Failed to load kanban",
          )
        : "Failed to load kanban";
    return (
      <GlassCard>
        <p className="py-8 text-center text-sm text-red-500">{message}</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="relative overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background/80 to-transparent" />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={data?.[status] ?? []}
              showSalesPerson={showSalesPerson}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} showSalesPerson={showSalesPerson} /> : null}
        </DragOverlay>
      </DndContext>
    </GlassCard>
  );
}
