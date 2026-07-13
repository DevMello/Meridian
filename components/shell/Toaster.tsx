"use client";

import { useToast } from "@/lib/hooks/useToast";
import { cn } from "@/lib/utils";

/** Top-center toast stack. */
export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "panel pointer-events-auto animate-fadeUp px-4 py-2 font-mono text-[11px]",
            t.kind === "ok" && "border-ok text-ok",
            t.kind === "warn" && "border-warn text-warn",
            t.kind === "bad" && "border-bad text-bad",
            t.kind === "info" && "text-ink",
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
