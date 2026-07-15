/**
 * TME (Transfer Multisort Elektronik) connector — TME API v2 (OAuth2).
 * Apps registered at developers.tme.eu after 2026-05-14 are v2-only, so this
 * targets v2: POST /auth/token with Basic base64(token:secret), then Bearer.
 *
 * Capabilities: search, details, pricing, availability, datasheet.
 * Enable with TME_TOKEN / TME_APP_SECRET; TME_COUNTRY and TME_CURRENCY tune
 * pricing (default US / USD).
 *
 * part_id is the TME product symbol (e.g. 1N4007-DIO).
 */
import { tmeAppSecret, tmeCountry, tmeCurrency, tmeToken } from "../config";
import type {
  CadAsset,
  ComponentDetails,
  ComponentResult,
  Offer,
  PriceBreak,
  SearchQuery,
} from "../models";
import { Capability } from "../models";
import { Provider, ProviderError } from "./base";

const API = "https://api.tme.eu";

/** Unit of sale, e.g. { id: "ST", short_name: "pcs", singular_translation: "Piece" }. */
interface TmeUnit {
  short_name?: string;
}

interface TmeProduct {
  symbol?: string;
  manufacturer_symbols?: string[];
  manufacturer?: { id?: number; name?: string };
  category?: { id?: number; name?: string };
  description?: string;
  product_status?: string[];
  unit?: TmeUnit;
  assets?: { primary_photo?: { prime?: string; thumbnail?: string } | null };
}

interface TmeDataElement {
  symbol?: string;
  stock_quantity?: number | null;
  unit?: TmeUnit;
  prices?: { elements?: { amount?: number; price?: number }[] } | null;
}

function httpsUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
}

export class TmeProvider extends Provider {
  readonly name = "tme";
  readonly displayName = "TME";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  private _token: string | null = null;
  private _tokenExpiry = 0;

  isConfigured(): boolean {
    return Boolean(tmeToken() && tmeAppSecret());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set TME_TOKEN and TME_APP_SECRET (developers.tme.eu).";
  }

  private async _getToken(): Promise<string> {
    if (this._token && Date.now() / 1000 < this._tokenExpiry - 30) {
      return this._token;
    }
    const basic = Buffer.from(`${tmeToken()}:${tmeAppSecret()}`).toString("base64");
    const resp = await fetch(`${API}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      throw new ProviderError(`tme: token request failed (${resp.status})`);
    }
    const data = (await resp.json()) as { access_token: string; expires_in?: number };
    this._token = data.access_token;
    this._tokenExpiry = Date.now() / 1000 + (data.expires_in ?? 300);
    return this._token;
  }

  /** GET an API path; `params` values that are arrays become repeated `key[]`. */
  private async get(
    path: string,
    params: Record<string, string | string[]>,
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${API}${path}`);
    url.searchParams.set("country", tmeCountry());
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(`${key}[]`, v);
      } else {
        url.searchParams.set(key, value);
      }
    }
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${await this._getToken()}`,
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new ProviderError(`tme: request failed (${resp.status}): ${body.slice(0, 200)}`);
    }
    const data = (await resp.json()) as { status?: string; data?: Record<string, unknown> };
    return data.data ?? {};
  }

  /**
   * Quantity price tiers + stock for a batch of symbols, keyed by symbol.
   * `amounts[]` is deliberately omitted: the API rejects it as an unknown
   * field unless `scope[]` includes `delivery`/`delivery_confirmed`, which
   * this call never requests.
   */
  private async fetchData(symbols: string[]): Promise<Map<string, TmeDataElement>> {
    if (!symbols.length) return new Map();
    const data = await this.get("/products/data", {
      currency: tmeCurrency(),
      scope: ["prices", "stock"],
      symbols,
    });
    const out = new Map<string, TmeDataElement>();
    for (const el of (data.elements as TmeDataElement[]) ?? []) {
      if (el.symbol) out.set(el.symbol, el);
    }
    return out;
  }

  private mapProduct(p: TmeProduct, data?: TmeDataElement): ComponentResult {
    const symbol = p.symbol ?? "";
    const breaks: PriceBreak[] = (data?.prices?.elements ?? [])
      .filter((t) => t.amount != null && t.price != null)
      .map((t) => ({
        quantity: t.amount as number,
        unit_price: t.price as number,
        currency: tmeCurrency(),
      }));
    const offer: Offer = {
      provider: this.name,
      part_id: symbol,
      product_url: symbol
        ? `https://www.tme.eu/en/details/${encodeURIComponent(symbol.toLowerCase())}/`
        : null,
      stock: data?.stock_quantity ?? null,
      price_breaks: breaks,
      packaging: p.unit?.short_name ?? data?.unit?.short_name ?? null,
    };
    return {
      mpn: p.manufacturer_symbols?.[0] || symbol,
      manufacturer: p.manufacturer?.name ?? null,
      description: p.description ?? null,
      category: p.category?.name ?? null,
      image_url: httpsUrl(p.assets?.primary_photo?.prime),
      offers: [offer],
    };
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const data = await this.get("/products/search", {
      phrase: query.keyword,
      scope: ["products"],
      limit: String(query.max_results),
    });
    const products = (data.products as { elements?: TmeProduct[] } | null)?.elements ?? [];
    let candidates = products.filter((p) => p.symbol).slice(0, query.max_results);
    if (query.manufacturer) {
      const needle = query.manufacturer.toLowerCase();
      candidates = candidates.filter((p) =>
        (p.manufacturer?.name ?? "").toLowerCase().includes(needle),
      );
    }
    // Search returns no pricing/stock — enrich with one batched data call.
    let priceData = new Map<string, TmeDataElement>();
    try {
      priceData = await this.fetchData(candidates.map((p) => p.symbol as string));
    } catch {
      // Pricing enrichment is best-effort; results are useful without it.
    }
    let results = candidates.map((p) => this.mapProduct(p, priceData.get(p.symbol as string)));
    if (query.in_stock_only) {
      results = results.filter((r) => r.offers.some((o) => (o.stock ?? 0) > 0));
    }
    return results;
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const [productData, parameterData, dataResult] = await Promise.all([
      this.get("/products", { symbols: [partId] }),
      this.get("/products/parameters", { symbols: [partId] }).catch(() => ({})),
      this.fetchData([partId]).catch(() => new Map<string, TmeDataElement>()),
    ]);
    const product = ((productData.elements as TmeProduct[]) ?? [])[0];
    if (!product?.symbol) {
      throw new ProviderError(`tme: part ${JSON.stringify(partId)} not found`);
    }
    const base = this.mapProduct(product, dataResult.get(product.symbol));

    const specs: Record<string, string> = {};
    const paramElements =
      (((parameterData as Record<string, unknown>).elements as {
        parameters?: { elements?: { name?: string; values?: { value?: string }[] }[] };
      }[]) ?? [])[0]?.parameters?.elements ?? [];
    for (const param of paramElements) {
      if (!param.name) continue;
      const values = (param.values ?? []).map((v) => v.value).filter(Boolean);
      if (values.length) specs[param.name] = values.join(", ");
    }

    return {
      ...base,
      datasheet_url: await this.fetchDatasheet(partId).catch(() => null),
      specifications: specs,
      lifecycle_status: product.product_status?.length
        ? product.product_status.join(", ")
        : null,
      cad_assets: [],
    };
  }

  async fetchPricing(partId: string): Promise<Offer> {
    const data = await this.fetchData([partId]);
    const el = data.get(partId) ?? [...data.values()][0];
    if (!el || !el.prices?.elements?.length) {
      throw new ProviderError(`tme: no pricing for ${JSON.stringify(partId)}`);
    }
    return this.mapProduct({ symbol: el.symbol ?? partId }, el).offers[0];
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    const data = await this.get("/products/files", { symbols: [partId] });
    const docs =
      (((data.elements as {
        documents?: { elements?: { url?: string; type?: string }[] };
      }[]) ?? [])[0]?.documents?.elements ?? []).filter((d) => d.url);
    const datasheet =
      docs.find((d) => /dte|datasheet/i.test(d.type ?? "")) ??
      docs.find((d) => (d.url ?? "").toLowerCase().endsWith(".pdf")) ??
      docs[0];
    return httpsUrl(datasheet?.url) ?? null;
  }

  async fetchModels(_partId: string): Promise<CadAsset[]> {
    throw new ProviderError("tme: CAD models not offered; use snapmagic or ultralibrarian");
  }
}
