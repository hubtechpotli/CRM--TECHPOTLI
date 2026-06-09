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
import { api } from "@/lib/api";
import { PROJECT_STATUSES } from "@/lib/types";
import { SectionCard } from "@/components/dashboard/section-card";
import { cn } from "@/lib/utils";

type Project = Record<string, unknown> & {
  id: string;
  customer?: { companyName?: string };
};

const COLUMN_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  NEW: { bg: "bg-sky-500/5", accent: "bg-sky-500", text: "text-sky-700" },
  DESIGN: { bg: "bg-violet-500/5", accent: "bg-violet-500", text: "text-violet-700" },
  DEVELOPMENT: { bg: "bg-indigo-500/5", accent: "bg-indigo-500", text: "text-indigo-700" },
  TESTING: { bg: "bg-amber-500/5", accent: "bg-amber-500", text: "text-amber-700" },
  CLIENT_REVIEW: { bg: "bg-cyan-500/5", accent: "bg-cyan-500", text: "text-cyan-700" },
  COMPLETED: { bg: "bg-emerald-500/5", accent: "bg-emerald-500", text: "text-emerald-700" },
  ON_HOLD: { bg: "bg-slate-500/5", accent: "bg-slate-500", text: "text-slate-700" },
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProjectCard({ project, isDragging }: { project: Project; isDragging?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-sm font-semibold">{String(project.name ?? "—")}</p>
      <p className="text-xs text-muted-foreground">{project.customer?.companyName ?? "—"}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{formatLabel(String(project.serviceType ?? ""))}</p>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Number(project.progress ?? 0)}%` }}
          />
        </div>
        {project.priority ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {String(project.priority)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DraggableProjectCard({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(project.id) });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <Link href={`/projects/${project.id}`} onClick={(e) => isDragging && e.preventDefault()} draggable={false}>
        <ProjectCard project={project} isDragging={isDragging} />
      </Link>
    </div>
  );
}

function KanbanColumn({ status, projects }: { status: string; projects: Project[] }) {
  const colors = COLUMN_COLORS[status] ?? COLUMN_COLORS.NEW;
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="w-[280px] shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn("text-xs font-semibold", colors.text)}>{formatLabel(status)}</h3>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", colors.bg, colors.text)}>
          {projects.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[160px] space-y-2 rounded-xl border border-border/40 p-2 transition",
          colors.bg,
          isOver && "ring-2 ring-primary/25",
        )}
      >
        <div className={cn("mb-1 h-0.5 rounded-full", colors.accent)} />
        {projects.map((project) => (
          <DraggableProjectCard key={String(project.id)} project={project} />
        ))}
        {projects.length === 0 ? (
          <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground">
            Drop projects here
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectKanban() {
  const queryClient = useQueryClient();
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects-kanban"],
    queryFn: async () => {
      const res = await api.get<Record<string, Project[]>>("/projects/kanban");
      return res.data;
    },
  });

  const statusMutation = useOptimisticMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      const res = await api.patch(`/projects/${projectId}/status`, { status });
      return res.data;
    },
    snapshotKeys: [["projects-kanban"]],
    invalidateKeys: [["projects-kanban"], ["projects"]],
    errorMessage: "Could not move project. Reverted.",
    onMutate: ({ projectId, status }) => {
      const found = findProject(projectId);
      if (found) {
        moveKanbanCard(
          queryClient,
          ["projects-kanban"],
          projectId,
          found.status,
          status,
          PROJECT_STATUSES,
        );
      }
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function findProject(id: string): { project: Project; status: string } | null {
    if (!data) return null;
    for (const status of PROJECT_STATUSES) {
      const project = (data[status] ?? []).find((p) => String(p.id) === id);
      if (project) return { project, status };
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const found = findProject(String(event.active.id));
    setActiveProject(found?.project ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveProject(null);
    const { active, over } = event;
    if (!over) return;

    const projectId = String(active.id);
    const newStatus = String(over.id);
    const found = findProject(projectId);
    if (!found || found.status === newStatus) return;
    if (!PROJECT_STATUSES.includes(newStatus as (typeof PROJECT_STATUSES)[number])) return;

    statusMutation.mutate({ projectId, status: newStatus });
  }

  if (isLoading) {
    return (
      <SectionCard>
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 w-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard>
        <p className="py-8 text-center text-sm text-red-500">Failed to load kanban</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard noPadding className="p-4">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {PROJECT_STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} projects={data?.[status] ?? []} />
          ))}
        </div>
        <DragOverlay>{activeProject ? <ProjectCard project={activeProject} /> : null}</DragOverlay>
      </DndContext>
    </SectionCard>
  );
}
