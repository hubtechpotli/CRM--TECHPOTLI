"use client";

import { FormEvent, useEffect } from "react";
import { Bell, CheckCircle2, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MentionBadge } from "@/components/team-updates/mention-badge";
import { TeamUpdateCompose, type ComposeFormState } from "@/components/team-updates/team-update-compose";
import type { Assignee } from "@/lib/types";

export type PostSuccess = {
  title: string;
  customerName: string;
  assigneeName?: string;
  broadcastTeam?: boolean;
};

export function PostUpdateModal({
  open,
  onOpenChange,
  form,
  onChange,
  onSubmit,
  error,
  pending,
  success,
  onDone,
  assignees,
  onCustomerSelect,
  selectedCustomerOption,
  customerSearchEnabled,
  projectOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ComposeFormState;
  onChange: (patch: Partial<ComposeFormState>) => void;
  onSubmit: (e: FormEvent) => void;
  error: string | null;
  pending: boolean;
  success: PostSuccess | null;
  onDone: () => void;
  assignees: Assignee[];
  onCustomerSelect?: (opt: { value: string; label: string; sublabel?: string } | null) => void;
  selectedCustomerOption?: { value: string; label: string; sublabel?: string } | null;
  customerSearchEnabled?: boolean;
  projectOptions: Array<{ value: string; label: string }>;
}) {
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [success, onDone]);

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!pending) onOpenChange(v);
      }}
      size="lg"
      title={success ? undefined : "Assign team task"}
      description={
        success
          ? undefined
          : "Create a work item — assign with @mention and your team gets notified instantly."
      }
    >
      {success ? (
        <div className="px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">Posted successfully!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{success.title}</span>
            <br />
            for {success.customerName}
          </p>

          <div className="mx-auto mt-5 max-w-sm rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-left">
            {success.assigneeName ? (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Assignee notified</p>
                  <div className="mt-1.5">
                    <MentionBadge name={success.assigneeName} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    They can open the task and tap <strong>Start work</strong> when ready.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Team broadcast sent</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Everyone on the team was notified. Someone can pick it up and start work.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDone}
            className="crm-btn-emerald mt-6 !text-xs"
          >
            Done
          </button>
        </div>
      ) : (
        <TeamUpdateCompose
          form={form}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          error={error}
          pending={pending}
          assignees={assignees}
          onCustomerSelect={onCustomerSelect}
          selectedCustomerOption={selectedCustomerOption}
          customerSearchEnabled={customerSearchEnabled}
          projectOptions={projectOptions}
          embedded
        />
      )}
    </Modal>
  );
}
