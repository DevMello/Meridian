"use client";

import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { AvatarMenu } from "./AvatarMenu";
import { Seg } from "@/components/meridian";
import { useModals } from "@/lib/hooks/useModals";

/** Fixed 54px top header — logo, breadcrumb, Search|Projects, MCP, theme, avatar. */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useModals();

  const section: "search" | "projects" = pathname.startsWith("/projects")
    ? "projects"
    : "search";

  return (
    <header className="flex h-[54px] flex-none items-center gap-4 border-b border-line bg-panel px-4">
      <Logo />
      <Breadcrumb pathname={pathname} />
      <div className="flex-1" />
      <Seg
        options={[
          { value: "search", label: "Search" },
          { value: "projects", label: "Projects" },
        ]}
        value={section}
        onChange={(v) => router.push(v === "search" ? "/search" : "/projects")}
      />
      <button className="btn sm" onClick={() => open("mcp")}>
        <span className="dot bg-ok" style={{ boxShadow: "0 0 6px var(--ok)" }} />
        MCP
      </button>
      <ThemeToggle />
      <AvatarMenu />
    </header>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      {segs.map((s, i) => (
        <span key={i} className="lbl flex items-center gap-1.5">
          {i > 0 && <span className="text-ink3">/</span>}
          {decodeURIComponent(s)}
        </span>
      ))}
    </div>
  );
}
