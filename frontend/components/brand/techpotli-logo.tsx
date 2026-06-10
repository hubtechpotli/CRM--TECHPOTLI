import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { width: 120, height: 36, className: "h-8 w-auto" },
  md: { width: 160, height: 48, className: "h-10 w-auto" },
  lg: { width: 200, height: 60, className: "h-14 w-auto" },
  xl: { width: 240, height: 72, className: "h-[4.5rem] w-auto" },
} as const;

export function TechPotliLogo({
  size = "md",
  showTagline = false,
  priority = false,
  className,
}: {
  size?: keyof typeof sizes;
  showTagline?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const s = sizes[size];

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <Image
        src="/techpotlilogo.png"
        alt="TechPotli"
        width={s.width}
        height={s.height}
        className={cn(s.className, "object-contain")}
        priority={priority}
      />
      {showTagline ? (
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Tech on makes things easy
        </p>
      ) : null}
    </div>
  );
}
