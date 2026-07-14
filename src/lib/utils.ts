import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a USD unit price, e.g. 1.6 -> "$1.62". */
export function formatUsd(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toFixed(digits)}`;
}

/** Compact stock count, e.g. 81100 -> "81.1k". */
export function formatStock(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

/**
 * Confines a post-auth "next" redirect to a same-origin relative path.
 * Rejects protocol-relative ("//host"), scheme-qualified ("https://host"),
 * and userinfo-prefixed ("@host") strings that would otherwise let
 * `${origin}${next}` resolve to a different host (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/search"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (next.includes("://") || next.includes("@")) return fallback;
  return next;
}
