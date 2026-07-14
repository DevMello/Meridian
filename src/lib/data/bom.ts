"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import type { BomLine } from "./types";

export async function listBomLines(projectId: string): Promise<BomLine[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("bom_lines")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  return (data as BomLine[]) ?? [];
}

export async function addBomLine(
  projectId: string,
  input: {
    ref?: string | null;
    qty_per_board?: number;
    mpn: string;
    provider?: string | null;
    part_id?: string | null;
    description?: string | null;
    unit_price?: number | null;
    sourcing?: string;
    data?: unknown;
    position?: number;
  },
): Promise<BomLine | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bom_lines")
    .insert({ ...input, project_id: projectId })
    .select("*")
    .single();
  return (data as BomLine) ?? null;
}

export async function updateBomLine(
  id: string,
  patch: Partial<Omit<BomLine, "id" | "project_id" | "created_at">>,
): Promise<BomLine | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bom_lines")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  return (data as BomLine) ?? null;
}

export async function removeBomLine(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("bom_lines").delete().eq("id", id);
}
