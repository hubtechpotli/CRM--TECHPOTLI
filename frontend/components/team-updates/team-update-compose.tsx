"use client";

import { FormEvent } from "react";
import { Loader2, MessageSquarePlus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { insertMention } from "@/lib/mentions";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { FormFooterActions, FormShell } from "@/components/ui/form-shell";
import { CustomerSearchField } from "@/components/ui/customer-search-field";
import { AssigneePicker } from "@/components/team-updates/assignee-picker";
import type { Assignee } from "@/lib/types";
import { FEATURE } from "@/lib/feature-colors";

const CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "DOMAIN", label: "Domain" },
  { value: "HOSTING", label: "Hosting" },
  { value: "PROJECT", label: "Project" },
  { value: "PAYMENT", label: "Payment" },
  { value: "DOCUMENT", label: "Document" },
  { value: "OTHER", label: "Other" },
];

export type ComposeFormState = {
  customerId: string;
  title: string;
  description: string;
  category: string;
  assignedToId: string;
  projectId: string;
  dueDate: string;
};

type TeamUpdateComposeProps = {
  form: ComposeFormState;
  onChange: (patch: Partial<ComposeFormState>) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  error: string | null;
  pending: boolean;
  assignees: Assignee[];
  onCustomerSelect?: (opt: { value: string; label: string; sublabel?: string } | null) => void;
  selectedCustomerOption?: { value: string; label: string; sublabel?: string } | null;
  customerSearchEnabled?: boolean;
  projectOptions: Array<{ value: string; label: string }>;
  projectsLoading?: boolean;
  embedded?: boolean;
};

function ComposeFields({
  form,
  onChange,
  error,
  assignees,
  onCustomerSelect,
  selectedCustomerOption,
  customerSearchEnabled,
  projectOptions,
}: Pick<
  TeamUpdateComposeProps,
  | "form"
  | "onChange"
  | "error"
  | "assignees"
  | "onCustomerSelect"
  | "selectedCustomerOption"
  | "customerSearchEnabled"
  | "projectOptions"
>) {
  const selectedAssignee = assignees.find((a) => a.id === form.assignedToId);

  return (
    <>
      <FormField label="Customer" error={!form.customerId && error === "Please select a customer" ? error : undefined}>
        <CustomerSearchField
          value={form.customerId}
          selectedOption={selectedCustomerOption}
          enabled={customerSearchEnabled}
          onSelect={(opt) => {
            onCustomerSelect?.(opt);
            onChange({ customerId: opt.value, projectId: "" });
          }}
          onClear={() => {
            onCustomerSelect?.(null);
            onChange({ customerId: "", projectId: "" });
          }}
        />
      </FormField>

      <FormField label="Title">
        <TextInput
          value={form.title}
          onChange={(v) => onChange({ title: v })}
          placeholder="e.g. Purchase domain, Logo change, Payment follow-up"
          required
        />
      </FormField>

      <FormField label="Details">
        <TextArea
          value={form.description}
          onChange={(v) => onChange({ description: v })}
          placeholder="Add context. Use @Name to mention someone in the note."
          rows={3}
        />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Category">
          <SelectInput value={form.category} onChange={(v) => onChange({ category: v })} options={CATEGORIES} />
        </FormField>
        <FormField label="Due date">
          <TextInput type="date" value={form.dueDate} onChange={(v) => onChange({ dueDate: v })} />
        </FormField>
      </div>

      <FormField label="Assign to (mention)">
        <AssigneePicker
          assignees={assignees}
          selectedId={form.assignedToId}
          selectedName={selectedAssignee?.name}
          onSelectWholeTeam={() => onChange({ assignedToId: "" })}
          onSelectAssignee={(a) =>
            onChange({
              assignedToId: a.id,
              description: insertMention(form.description, a.name),
            })
          }
        />
      </FormField>

      {form.customerId ? (
        <FormField label="Link project (optional)">
          <SelectInput
            value={form.projectId}
            onChange={(v) => onChange({ projectId: v })}
            placeholder="No project"
            options={[{ value: "", label: "No project" }, ...projectOptions]}
          />
        </FormField>
      ) : null}

      {error && error !== "Please select a customer" ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : null}
    </>
  );
}

export function TeamUpdateCompose({
  form,
  onChange,
  onSubmit,
  onCancel,
  error,
  pending,
  assignees,
  onCustomerSelect,
  selectedCustomerOption,
  customerSearchEnabled = true,
  projectOptions,
  embedded = false,
}: TeamUpdateComposeProps) {
  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="crm-btn-ghost !text-xs"
      >
        Discard
      </button>
      <button
        type="submit"
        disabled={pending}
        className="crm-btn-violet min-w-[7.5rem] !text-xs disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Posting…
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" />
            Post update
          </>
        )}
      </button>
    </div>
  );

  const formBody = (
    <form onSubmit={onSubmit} className={cn(embedded && "flex min-h-0 flex-1 flex-col")}>
      {embedded ? (
        <FormShell footer={footer} className="max-h-[min(72vh,680px)]">
          <ComposeFields
            form={form}
            onChange={onChange}
            error={error}
            assignees={assignees}
            onCustomerSelect={onCustomerSelect}
            selectedCustomerOption={selectedCustomerOption}
            customerSearchEnabled={customerSearchEnabled}
            projectOptions={projectOptions}
          />
        </FormShell>
      ) : (
        <div className="space-y-3 p-4">
          <ComposeFields
            form={form}
            onChange={onChange}
            error={error}
            assignees={assignees}
            onCustomerSelect={onCustomerSelect}
            selectedCustomerOption={selectedCustomerOption}
            customerSearchEnabled={customerSearchEnabled}
            projectOptions={projectOptions}
          />
          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
            {footer}
          </div>
        </div>
      )}
    </form>
  );

  if (embedded) return formBody;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm",
              FEATURE.teamUpdates.solid,
            )}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Post team update</p>
            <p className="text-[10px] text-muted-foreground">Visible to the whole team · assign with @mention</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
      {formBody}
    </div>
  );
}
