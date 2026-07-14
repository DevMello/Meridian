"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import type { Project } from "./types";

export async function listProjects(): Promise<Project[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data as Project[]) ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).single();
  return (data as Project) ?? null;
}

export async function createProject(input: {
  name: string;
  description?: string | null;
  build_qty?: number;
}): Promise<Project | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .insert({ ...input, user_id: user.id })
    .select("*")
    .single();
  return (data as Project) ?? null;
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "rev" | "status" | "description" | "link" | "build_qty">>,
): Promise<Project | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  return (data as Project) ?? null;
}

export async function deleteProject(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
}
