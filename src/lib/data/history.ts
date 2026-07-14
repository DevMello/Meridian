"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import type { SearchHistoryRow } from "./types";

export async function listSearchHistory(limit = 20): Promise<SearchHistoryRow[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("search_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as SearchHistoryRow[]) ?? [];
}

export async function recordSearch(input: {
  query: string;
  providers: string[];
  result_count: number;
}): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("search_history").insert({ ...input, user_id: user.id });
}

export async function clearSearchHistory(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("search_history").delete().eq("user_id", user.id);
}
