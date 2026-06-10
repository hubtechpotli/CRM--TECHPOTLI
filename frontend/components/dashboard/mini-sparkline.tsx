"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function MiniSparkline({
  data,
  color = "#6366f1",
  className,
}: {
  data?: { v: number }[];
  color?: string;
  className?: string;
}) {
  const points = useMemo(() => {
    const values = data?.length ? data.map((d) => d.v) : [0, 0];
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const w = 120;
    const h = 40;
    const step = values.length > 1 ? w / (values.length - 1) : w;

    const coords = values.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    });

    const linePath = `M ${coords.join(" L ")}`;
    const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;
    const id = `spark-${color.replace("#", "")}`;

    return { linePath, areaPath, id, w, h };
  }, [data, color]);

  return (
    <svg
      viewBox={`0 0 ${points.w} ${points.h}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={points.id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={points.areaPath} fill={`url(#${points.id})`} />
      <path
        d={points.linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
