/**
 * Typed client for the Meridian REST API (app/api/*). The route handlers are
 * added by backend work units; these shapes are the contract they must satisfy.
 */
import type {
  CadAsset,
  ComponentDetails,
  ComponentResult,
  Offer,
} from "@/lib/domain/models";

export interface SearchParams {
  keyword: string;
  providers?: string[];
  manufacturer?: string;
  category?: string;
  in_stock_only?: boolean;
  max_results_per_provider?: number;
}

export interface SearchResponse {
  results: ComponentResult[];
  providers_searched: string[];
  providers_skipped: { provider: string; reason: string }[];
  note: string;
}

export interface ProviderInfo {
  name: string;
  display_name: string;
  capabilities: string[];
  configured: boolean;
  how_to_enable?: string;
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error ?? body.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  search(params: SearchParams): Promise<SearchResponse> {
    return jsonFetch<SearchResponse>("/api/search", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  providers(): Promise<{ providers: ProviderInfo[] }> {
    return jsonFetch("/api/providers");
  },
  part(provider: string, partId: string): Promise<ComponentDetails> {
    return jsonFetch(`/api/part/${provider}/${encodeURIComponent(partId)}`);
  },
  pricing(provider: string, partId: string): Promise<Offer> {
    return jsonFetch(`/api/pricing/${provider}/${encodeURIComponent(partId)}`);
  },
  cad(
    provider: string,
    partId: string,
  ): Promise<{ part_id: string; provider: string; cad_assets: CadAsset[] }> {
    return jsonFetch(`/api/cad/${provider}/${encodeURIComponent(partId)}`);
  },
  datasheet(
    provider: string,
    partId: string,
  ): Promise<{ part_id: string; provider: string; datasheet_url: string | null }> {
    return jsonFetch(`/api/datasheet/${provider}/${encodeURIComponent(partId)}`);
  },
  exportLink(provider: string, partId: string): string {
    return `/api/export/${provider}/${encodeURIComponent(partId)}`;
  },
};
