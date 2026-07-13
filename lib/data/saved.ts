"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import type { SavedPart } from "./types";

export async function listSavedParts(): Promise<SavedPart[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_parts")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as SavedPart[]) ?? [];
}

export async function savePart(input: {
  provider: string;
  part_id: string;
  mpn: string;
  manufacturer?: string | null;
  description?: string | null;
  data?: unknown;
}): Promise<SavedPart | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_parts")
    .upsert(
      { ...input, user_id: user.id },
      { onConflict: "user_id,provider,part_id" },
    )
    .select("*")
    .single();
  return (data as SavedPart) ?? null;
}

export async function removeSavedPart(provider: string, partId: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase
    .from("saved_parts")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider)
    .eq("part_id", partId);
}
