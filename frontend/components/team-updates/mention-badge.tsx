"use client";

import { AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { mentionHandle, parseMentions } from "@/lib/mentions";
import { avatarColorFor } from "@/lib/avatar-colors";
import { UserAvatar } from "@/components/ui/user-avatar";

export function MentionBadge({
  name,
  isYou,
  size = "md",
  className,
}: {
  name: string;
  isYou?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const sm = size === "sm";
  const color = avatarColorFor(name);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        sm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        isYou
          ? cn(color.solid, "text-white shadow-sm")
          : cn(color.light, color.text, color.border, "border"),
        className,
      )}
    >
      <AtSign className={cn(sm ? "h-2.5 w-2.5" : "h-3 w-3", isYou ? "text-white/90" : color.text)} />
      {!sm ? <UserAvatar name={name} size="xs" /> : null}
      <span>{mentionHandle(name)}</span>
      {isYou ? (
        <span
          className={cn(
            "rounded-full bg-white/20 font-bold uppercase",
            sm ? "px-1 text-[8px]" : "px-1.5 text-[9px]",
          )}
        >
          you
        </span>
      ) : null}
    </span>
  );
}

export function MentionText({
  text,
  users = [],
  className,
}: {
  text: string;
  users?: Array<{ id: string; name: string }>;
  className?: string;
}) {
  const parts = parseMentions(text, users);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <span
            key={i}
            className={cn(
              "mx-0.5 inline-flex items-center rounded-md border px-1 py-0.5 font-semibold",
              part.user
                ? cn(avatarColorFor(part.user.name).light, avatarColorFor(part.user.name).text, avatarColorFor(part.user.name).border)
                : "border-border bg-muted/60 text-foreground",
            )}
          >
            {part.user ? mentionHandle(part.user.name) : part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  );
}

export function AssigneeHighlight({
  name,
  userId,
  currentUserId,
  className,
}: {
  name: string;
  userId?: string;
  currentUserId?: string;
  className?: string;
}) {
  const isYou = Boolean(userId && currentUserId && userId === currentUserId);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">Assigned to</span>
      <MentionBadge name={name} isYou={isYou} />
      {isYou ? (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          Action needed
        </span>
      ) : null}
    </div>
  );
}
