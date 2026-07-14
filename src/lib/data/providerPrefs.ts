"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import type { ProviderPref } from "./types";

export async function listProviderPrefs(): Promise<ProviderPref[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("provider_prefs").select("*");
  return (data as ProviderPref[]) ?? [];
}

export async function setProviderPref(provider: string, enabled: boolean): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase
    .from("provider_prefs")
    .upsert({ user_id: user.id, provider, enabled }, { onConflict: "user_id,provider" });
}
