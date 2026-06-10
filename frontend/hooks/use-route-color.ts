"use client";

import { usePathname } from "next/navigation";
import { getRouteColor } from "@/lib/nav-colors";

export function useRouteColor() {
  const pathname = usePathname();
  return getRouteColor(pathname);
}
