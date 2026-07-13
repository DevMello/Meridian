"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** Named modals opened from anywhere (MCP, Sources, Profile, New project, ...). */
export type ModalName = "mcp" | "sources" | "profile" | "new-project" | (string & {});

interface ModalsContextValue {
  active: ModalName | null;
  open: (name: ModalName) => void;
  close: () => void;
  isOpen: (name: ModalName) => boolean;
}

const ModalsContext = createContext<ModalsContextValue | null>(null);

export function ModalsProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ModalName | null>(null);
  const open = useCallback((name: ModalName) => setActive(name), []);
  const close = useCallback(() => setActive(null), []);
  const isOpen = useCallback((name: ModalName) => active === name, [active]);
  const value = useMemo(() => ({ active, open, close, isOpen }), [active, open, close, isOpen]);
  return <ModalsContext.Provider value={value}>{children}</ModalsContext.Provider>;
}

export function useModals() {
  const ctx = useContext(ModalsContext);
  if (!ctx) throw new Error("useModals must be used within ModalsProvider");
  return ctx;
}
