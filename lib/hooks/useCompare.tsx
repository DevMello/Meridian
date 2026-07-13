"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface CompareItem {
  provider: string;
  part_id: string;
  mpn: string;
}

const MAX_COMPARE = 3;

interface CompareContextValue {
  items: CompareItem[];
  has: (partId: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (partId: string) => void;
  clear: () => void;
  full: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  const has = useCallback((partId: string) => items.some((i) => i.part_id === partId), [items]);

  const toggle = useCallback((item: CompareItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.part_id === item.part_id)) {
        return prev.filter((i) => i.part_id !== item.part_id);
      }
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((partId: string) => {
    setItems((prev) => prev.filter((i) => i.part_id !== partId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, has, toggle, remove, clear, full: items.length >= MAX_COMPARE }),
    [items, has, toggle, remove, clear],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
