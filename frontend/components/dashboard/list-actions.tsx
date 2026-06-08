import Link from "next/link";

export function ListViewLink({ href, label = "View" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="text-xs font-medium text-primary hover:underline">
      {label}
    </Link>
  );
}

export function ListActionButton({
  label,
  onClick,
  variant = "default",
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
}) {
  const cls =
    variant === "danger"
      ? "text-red-600 hover:underline"
      : variant === "success"
        ? "text-green-600 hover:underline"
        : "text-primary hover:underline";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`text-xs font-medium disabled:opacity-50 ${cls}`}>
      {label}
    </button>
  );
}
