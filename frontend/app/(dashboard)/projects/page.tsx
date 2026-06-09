"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Columns3, List, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_STATUSES } from "@/lib/types";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { SectionCard } from "@/components/dashboard/section-card";
import { PremiumDataTable } from "@/components/dashboard/premium-data-table";
import { ProjectForm } from "@/components/projects/project-form";
import dynamic from "next/dynamic";

const ProjectKanban = dynamic(() => import("@/components/projects/project-kanban").then((m) => m.ProjectKanban), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-96 animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
      ))}
    </div>
  ),
});
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type ProjectRow = Record<string, unknown> & {
  customer?: { companyName?: string };
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_TABS = [
  { value: "", label: "All Projects" },
  ...PROJECT_STATUSES.map((s) => ({ value: s, label: formatLabel(s) })),
];

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowNewProject(true);
  }, [searchParams]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ProjectRow[]>("/projects");
      return res.data;
    },
  });

  const rows = useMemo(() => {
    const allRows = Array.isArray(data) ? data : [];
    if (!statusFilter) return allRows;
    return allRows.filter((r) => r.status === statusFilter);
  }, [data, statusFilter]);

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Projects"
        description="Active and completed client projects."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              New Project
            </button>
            <div className="flex rounded-xl border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
                  view === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                )}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
                  view === "kanban" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                )}
              >
                <Columns3 className="h-3.5 w-3.5" /> Kanban
              </button>
            </div>
          </div>
        }
      />

      {view === "kanban" ? <ProjectKanban /> : (
        <SectionCard noPadding>
          <div className="border-b border-border/50 p-5">
            <StatusTabs tabs={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
          </div>
          {error ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-500">Failed to load projects</p>
              <button type="button" onClick={() => refetch()} className="mt-3 text-sm text-primary hover:underline">
                Retry
              </button>
            </div>
          ) : (
            <PremiumDataTable
              loading={isLoading}
              rows={rows}
              onRowClick={(row) => router.push(`/projects/${row.id}`)}
              rowActions={(row) => [
                { label: "Open project", onClick: () => router.push(`/projects/${row.id}`) },
              ]}
              columns={[
                {
                  key: "name",
                  label: "Project",
                  render: (row) => (
                    <Link href={`/projects/${row.id}`} className="font-semibold hover:text-primary">
                      {String(row.name ?? "—")}
                    </Link>
                  ),
                },
                {
                  key: "customer",
                  label: "Customer",
                  render: (row) => String(row.customer?.companyName ?? "—"),
                },
                {
                  key: "serviceType",
                  label: "Service",
                  render: (row) => formatLabel(String(row.serviceType ?? "—")),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {formatLabel(String(row.status ?? "—"))}
                    </span>
                  ),
                },
                {
                  key: "priority",
                  label: "Priority",
                  render: (row) => (
                    <span className="text-xs text-muted-foreground">
                      {formatLabel(String(row.priority ?? "—"))}
                    </span>
                  ),
                },
                {
                  key: "progress",
                  label: "Progress",
                  render: (row) => (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Number(row.progress ?? 0)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{Number(row.progress ?? 0)}%</span>
                    </div>
                  ),
                },
              ]}
              footer={
                <p className="text-xs text-muted-foreground">
                  Showing {rows.length} project{rows.length === 1 ? "" : "s"}
                </p>
              }
            />
          )}
        </SectionCard>
      )}

      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="New project" size="lg">
        <ProjectForm
          onCancel={() => setShowNewProject(false)}
          onSuccess={(project) => {
            setShowNewProject(false);
            if (project.id) router.push(`/projects/${project.id}`);
          }}
        />
      </Modal>
    </div>
  );
}
