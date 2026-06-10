"use client";

import { AtSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarColorFor } from "@/lib/avatar-colors";
import { FEATURE } from "@/lib/feature-colors";
import { UserAvatar } from "@/components/ui/user-avatar";
import { MentionBadge } from "@/components/team-updates/mention-badge";
import type { Assignee } from "@/lib/types";

export function AssigneePicker({
  assignees,
  selectedId,
  onSelectWholeTeam,
  onSelectAssignee,
  selectedName,
}: {
  assignees: Assignee[];
  selectedId: string;
  onSelectWholeTeam: () => void;
  onSelectAssignee: (assignee: Assignee) => void;
  selectedName?: string;
}) {
  const team = FEATURE.teamUpdates;
  const wholeTeamSelected = !selectedId;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onSelectWholeTeam}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition shadow-sm",
            wholeTeamSelected
              ? cn(team.solid, "border-transparent text-white")
              : cn(team.border, team.light, team.text, team.hoverBg),
          )}
        >
          <Users className="h-3 w-3" />
          Whole team
        </button>

        {assignees.map((a) => {
          const color = avatarColorFor(a.name);
          const selected = selectedId === a.id;
          const firstName = a.name.split(" ")[0];

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAssignee(a)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-1 pr-2.5 text-[10px] font-semibold transition shadow-sm",
                selected
                  ? cn(color.light, color.text, color.border, "ring-2", color.ring)
                  : cn("border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:shadow-md"),
              )}
            >
              <UserAvatar name={a.name} size="xs" />
              <AtSign className={cn("h-2.5 w-2.5", selected ? color.text : "text-muted-foreground")} />
              <span className="max-w-[5rem] truncate">{firstName}</span>
            </button>
          );
        })}
      </div>

      {selectedName ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2",
            avatarColorFor(selectedName).light,
            avatarColorFor(selectedName).border,
          )}
        >
          <MentionBadge name={selectedName} />
          <span className="text-[10px] text-muted-foreground">They&apos;ll get a notification</span>
        </div>
      ) : wholeTeamSelected ? (
        <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", team.light, team.border)}>
          <Users className={cn("h-3.5 w-3.5", team.iconColor)} />
          <span className={cn("text-[10px] font-medium", team.text)}>Visible to entire team</span>
        </div>
      ) : null}
    </div>
  );
}
