/**
 * Capability-based provider connector interface — TS port of providers/base.py.
 *
 * A provider isn't a website — it's a set of capabilities. The coordinator asks
 * "who can answer this part of the request?" and only calls providers that
 * declare (and are configured for) the needed capability.
 */
import type {
  CadAsset,
  Capability,
  ComponentDetails,
  ComponentResult,
  Offer,
  SearchQuery,
} from "../models";

/** Raised by connectors on upstream/API failures; reported per-provider, never fatal. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export abstract class Provider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: ReadonlySet<Capability>;

  /** True when required credentials (if any) are present. */
  abstract isConfigured(): boolean;

  /** Human-readable hint about what's needed to enable this provider. */
  missingConfig(): string | null {
    return null;
  }

  async search(_query: SearchQuery): Promise<ComponentResult[]> {
    throw new ProviderError(`${this.name} does not support search`);
  }

  async fetchDetails(_partId: string): Promise<ComponentDetails> {
    throw new ProviderError(`${this.name} does not support details`);
  }

  async fetchPricing(_partId: string): Promise<Offer> {
    throw new ProviderError(`${this.name} does not support pricing`);
  }

  async fetchModels(_partId: string): Promise<CadAsset[]> {
    throw new ProviderError(`${this.name} does not support CAD models`);
  }

  async fetchDatasheet(_partId: string): Promise<string | null> {
    throw new ProviderError(`${this.name} does not support datasheets`);
  }
}
