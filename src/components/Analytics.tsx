"use client";

import { usePathname } from "next/navigation";
import { usePulse, usePulsePageviews } from "@pulse/sdk/react";

// The ingest key is public by design — Pulse's domain allow-list is what
// gates forged events, not key secrecy.
const PULSE_HOST =
  process.env.NEXT_PUBLIC_PULSE_HOST ?? "https://pulse.devmello.xyz";
const PULSE_KEY =
  process.env.NEXT_PUBLIC_PULSE_KEY ?? "4b4cb455f8a38e36d53dd454";

export function Analytics() {
  // App Router navigations don't always go through pushState, so the History
  // patch is off and pageviews are driven from the pathname instead.
  usePulse({
    key: PULSE_KEY,
    host: PULSE_HOST,
    autoPageviews: false,
  });
  usePulsePageviews(usePathname());
  return null;
}
