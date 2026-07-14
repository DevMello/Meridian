import Link from "next/link";
import { cn } from "@/lib/utils";

/** MERIDIAN wordmark + mark (square, vertical center line, filled center dot). */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/search" className={cn("flex items-center gap-2.5 no-underline", className)}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none">
        <rect x="1.5" y="1.5" width="17" height="17" stroke="var(--acc)" strokeWidth="1.4" />
        <line x1="10" y1="1.5" x2="10" y2="18.5" stroke="var(--acc)" strokeWidth="1.2" />
        <circle cx="10" cy="10" r="3" fill="var(--acc)" />
      </svg>
      <span className="mono text-[13px] font-bold tracking-[0.1em] text-ink">MERIDIAN</span>
    </Link>
  );
}
