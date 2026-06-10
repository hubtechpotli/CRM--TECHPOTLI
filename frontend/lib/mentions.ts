export type MentionUser = { id: string; name: string };

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function mentionHandle(name: string) {
  return `@${firstName(name)}`;
}

/** Split text into plain segments and @mention segments (matched against known names). */
export function parseMentions(
  text: string,
  users: MentionUser[],
): Array<{ type: "text" | "mention"; value: string; user?: MentionUser }> {
  if (!text.trim() || users.length === 0) {
    return [{ type: "text", value: text }];
  }

  const sorted = [...users].sort((a, b) => b.name.length - a.name.length);
  const pattern = sorted
    .map((u) => u.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(`@(?:${pattern})|@(\\w+)`, "gi");

  const parts: Array<{ type: "text" | "mention"; value: string; user?: MentionUser }> = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    const raw = match[0];
    const user =
      sorted.find((u) => raw.toLowerCase() === `@${u.name.toLowerCase()}`) ??
      sorted.find((u) => raw.toLowerCase() === `@${firstName(u.name).toLowerCase()}`);
    parts.push({ type: "mention", value: raw, user });
    last = match.index + raw.length;
  }

  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }

  return parts.length ? parts : [{ type: "text", value: text }];
}

export function insertMention(current: string, userName: string) {
  const handle = mentionHandle(userName);
  const trimmed = current.trimEnd();
  if (!trimmed) return `${handle} `;
  if (trimmed.endsWith(handle)) return `${trimmed} `;
  return `${trimmed} ${handle} `;
}
