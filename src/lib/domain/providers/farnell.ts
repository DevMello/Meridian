/**
 * Farnell / element14 / Newark connector — Product Search API (REST).
 *
 * Capabilities: search, details, pricing, availability, datasheet.
 * Enable with FARNELL_API_KEY (free key from https://partner.element14.com);
 * FARNELL_STORE picks the storefront (default www.newark.com, the US store).
 *
 * part_id is the element14 SKU (order code).
 */
import { farnellApiKey, farnellStore } from "../config";
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

const API = "https://api.element14.com/catalog/products";

interface FarnellProduct {
  sku?: string;
  displayName?: string;
  brandName?: string;
  translatedManufacturerPartNumber?: string;
  productStatus?: string;
  inv?: number;
  stock?: { level?: number };
  packSize?: number;
  unitOfMeasure?: string;
  prices?: { from?: number; to?: number; cost?: number }[];
  datasheets?: { type?: string; description?: string; url?: string }[];
  attributes?: { attributeLabel?: string; attributeValue?: string; attributeUnit?: string }[];
  image?: { baseName?: string; vrntPath?: string };
}

/** Storefronts price in their local currency; map the common ones. */
function storeCurrency(store: string): string {
  if (store.includes("farnell") && !store.startsWith("export.")) {
    return store.startsWith("uk.") ? "GBP" : "EUR";
  }
  return "USD";
}

export class FarnellProvider extends Provider {
  readonly name = "farnell";
  readonly displayName = "Farnell / Newark (element14)";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(farnellApiKey());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set FARNELL_API_KEY (free key at partner.element14.com).";
  }

  private async query(term: string, numberOfResults: number): Promise<FarnellProduct[]> {
    const url = new URL(API);
    url.searchParams.set("term", term);
    url.searchParams.set("storeInfo.id", farnellStore());
    url.searchParams.set("resultsSettings.offset", "0");
    url.searchParams.set("resultsSettings.numberOfResults", String(numberOfResults));
    url.searchParams.set("resultsSettings.responseGroup", "large");
    url.searchParams.set("callInfo.responseDataFormat", "JSON");
    url.searchParams.set("callInfo.apiKey", farnellApiKey() ?? "");
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new ProviderError(`farnell: request failed (${resp.status}): ${body.slice(0, 200)}`);
    }
    const data = (await resp.json()) as Record<string, unknown>;
    // The wrapper key varies by term type (keywordSearchReturn,
    // premierFarnellPartNumberReturn, …) — take whichever carries products.
    for (const value of Object.values(data)) {
      if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).products)) {
        return (value as { products: FarnellProduct[] }).products;
      }
    }
    return [];
  }

  private imageUrl(p: FarnellProduct): string | null {
    const baseName = p.image?.baseName;
    if (!baseName) return null;
    const locale = p.image?.vrntPath === "nio/" ? "en_US" : "en_GB";
    const path = baseName.startsWith("/") ? baseName : `/${baseName}`;
    return `https://${farnellStore()}/productimages/standard/${locale}${path}`;
  }

  private mapProduct(p: FarnellProduct): ComponentResult {
    const currency = storeCurrency(farnellStore());
    const breaks: PriceBreak[] = (p.prices ?? [])
      .filter((b) => b.from != null && b.cost != null)
      .map((b) => ({ quantity: b.from as number, unit_price: b.cost as number, currency }));
    const specs: Record<string, string> = {};
    for (const attr of p.attributes ?? []) {
      if (!attr.attributeLabel) continue;
      const unit = attr.attributeUnit ? ` ${attr.attributeUnit}` : "";
      specs[attr.attributeLabel] = `${attr.attributeValue ?? ""}${unit}`;
    }
    const sku = p.sku ?? "";
    const offer: Offer = {
      provider: this.name,
      part_id: sku,
      product_url: sku ? `https://${farnellStore()}/search?st=${encodeURIComponent(sku)}` : null,
      stock: p.inv ?? p.stock?.level ?? null,
      price_breaks: breaks,
      packaging: p.unitOfMeasure ?? null,
    };
    return {
      mpn: p.translatedManufacturerPartNumber || sku,
      manufacturer: p.brandName ?? null,
      description: p.displayName ?? null,
      datasheet_url: (p.datasheets ?? []).find((d) => d.url)?.url ?? null,
      image_url: this.imageUrl(p),
      offers: [offer],
      specifications: Object.keys(specs).length > 0 ? specs : undefined,
    };
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const products = await this.query(`any:${query.keyword}`, query.max_results);
    let results = products.map((p) => this.mapProduct(p));
    if (query.manufacturer) {
      const needle = query.manufacturer.toLowerCase();
      results = results.filter((r) => (r.manufacturer ?? "").toLowerCase().includes(needle));
    }
    if (query.in_stock_only) {
      results = results.filter((r) => r.offers.some((o) => (o.stock ?? 0) > 0));
    }
    return results;
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const products = await this.query(`id:${partId}`, 1);
    if (!products.length) {
      throw new ProviderError(`farnell: part ${JSON.stringify(partId)} not found`);
    }
    const base = this.mapProduct(products[0]);
    return {
      ...base,
      specifications: base.specifications ?? {},
      lifecycle_status: products[0].productStatus ?? null,
      cad_assets: [],
    };
  }

  async fetchPricing(partId: string): Promise<Offer> {
    const details = await this.fetchDetails(partId);
    if (!details.offers.length || !details.offers[0].price_breaks.length) {
      throw new ProviderError(`farnell: no pricing for ${JSON.stringify(partId)}`);
    }
    return details.offers[0];
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    return (await this.fetchDetails(partId)).datasheet_url ?? null;
  }

  async fetchModels(_partId: string): Promise<CadAsset[]> {
    throw new ProviderError("farnell: CAD models not offered; use snapmagic or ultralibrarian");
  }
}
