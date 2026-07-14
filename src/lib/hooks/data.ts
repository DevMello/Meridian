"use client";

/**
 * React Query hooks over the Supabase data layer (lib/data/*). Feature units
 * consume these so screens never talk to Supabase directly.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSavedParts, removeSavedPart, savePart } from "@/lib/data/saved";
import { listSearchHistory, recordSearch } from "@/lib/data/history";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "@/lib/data/projects";
import { addBomLine, listBomLines, removeBomLine, updateBomLine } from "@/lib/data/bom";
import { listProviderPrefs, setProviderPref } from "@/lib/data/providerPrefs";

export function useSavedParts() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["saved-parts"], queryFn: () => listSavedParts() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["saved-parts"] });
  const save = useMutation({ mutationFn: savePart, onSuccess: invalidate });
  const remove = useMutation({
    mutationFn: ({ provider, partId }: { provider: string; partId: string }) =>
      removeSavedPart(provider, partId),
    onSuccess: invalidate,
  });
  return { ...query, save, remove };
}

export function useSearchHistory(limit = 20) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["search-history", limit],
    queryFn: () => listSearchHistory(limit),
  });
  const record = useMutation({
    mutationFn: recordSearch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-history"] }),
  });
  return { ...query, record };
}

export function useProjects() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["projects"] });
  const create = useMutation({ mutationFn: createProject, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateProject>[1] }) =>
      updateProject(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteProject, onSuccess: invalidate });
  return { ...query, create, update, remove };
}

export function useBom(projectId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["bom", projectId],
    queryFn: () => listBomLines(projectId),
    enabled: Boolean(projectId),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["bom", projectId] });
  const add = useMutation({
    mutationFn: (input: Parameters<typeof addBomLine>[1]) => addBomLine(projectId, input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateBomLine>[1] }) =>
      updateBomLine(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: removeBomLine, onSuccess: invalidate });
  return { ...query, add, update, remove };
}

export function useProviderPrefs() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["provider-prefs"], queryFn: () => listProviderPrefs() });
  const set = useMutation({
    mutationFn: ({ provider, enabled }: { provider: string; enabled: boolean }) =>
      setProviderPref(provider, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider-prefs"] }),
  });
  return { ...query, set };
}
