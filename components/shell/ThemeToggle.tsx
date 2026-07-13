"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** Toggles between the th-dark and th-light token sets. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme !== "light";
  return (
    <button
      className="btn sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {mounted ? (isDark ? "◐ Dark" : "◑ Light") : "◐ Dark"}
    </button>
  );
}
