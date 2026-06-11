/** Distinct, professional avatar & chip colors per person (hash by name) */
export type AvatarColor = {
  solid: string;
  light: string;
  text: string;
  border: string;
  ring: string;
};

export const AVATAR_PALETTE: AvatarColor[] = [
  {
    solid: "bg-indigo-500",
    light: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-500/35",
    ring: "ring-indigo-400/40",
  },
  {
    solid: "bg-sky-500",
    light: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-500/35",
    ring: "ring-sky-400/40",
  },
  {
    solid: "bg-teal-500",
    light: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-500/35",
    ring: "ring-teal-400/40",
  },
  {
    solid: "bg-violet-500",
    light: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-500/35",
    ring: "ring-violet-400/40",
  },
  {
    solid: "bg-rose-500",
    light: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-500/35",
    ring: "ring-rose-400/40",
  },
  {
    solid: "bg-amber-500",
    light: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/35",
    ring: "ring-amber-400/40",
  },
  {
    solid: "bg-cyan-500",
    light: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-500/35",
    ring: "ring-cyan-400/40",
  },
  {
    solid: "bg-fuchsia-500",
    light: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-200 dark:border-fuchsia-500/35",
    ring: "ring-fuchsia-400/40",
  },
  {
    solid: "bg-emerald-500",
    light: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/35",
    ring: "ring-emerald-400/40",
  },
  {
    solid: "bg-orange-500",
    light: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-500/35",
    ring: "ring-orange-400/40",
  },
  {
    solid: "bg-blue-600",
    light: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-500/35",
    ring: "ring-blue-400/40",
  },
  {
    solid: "bg-purple-500",
    light: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-500/35",
    ring: "ring-purple-400/40",
  },
];

function hashName(name: string) {
  let hash = 0;
  const key = name.trim().toLowerCase();
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

export function avatarColorFor(name: string): AvatarColor {
  return AVATAR_PALETTE[hashName(name) % AVATAR_PALETTE.length];
}

/** Deterministic initials: "Rahul Sharma" → RS, "TechPotli" → TE */
export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1) {
    const word = parts[0];
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word[0]?.toUpperCase() ?? "?";
  }
  return "?";
}
