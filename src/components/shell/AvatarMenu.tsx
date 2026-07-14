"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useModals } from "@/lib/hooks/useModals";

function initials(nameOrEmail: string): string {
  const base = nameOrEmail.trim();
  if (!base) return "?";
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function AvatarMenu() {
  const router = useRouter();
  const { open } = useModals();
  const [label, setLabel] = useState("?");
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLabel("ME");
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) setLabel(initials((u.user_metadata?.full_name as string) ?? u.email ?? "?"));
    });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    if (isSupabaseConfigured()) {
      await createClient().auth.signOut();
    }
    router.push("/sign-in");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-line2 bg-panel2 font-mono text-[10px] font-semibold text-ink hover:border-ink3"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Account menu"
      >
        {label}
      </button>
      {menuOpen && (
        <div className="panel absolute right-0 top-10 z-50 w-44 py-1 animate-fadeIn">
          <button
            className="nv text-[12.5px]"
            onClick={() => {
              open("profile");
              setMenuOpen(false);
            }}
          >
            Edit profile
          </button>
          <button className="nv text-[12.5px]" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
