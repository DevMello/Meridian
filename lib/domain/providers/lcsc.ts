/**
 * STUB — replaced by the "providers: demo + lcsc" work unit.
 * Ports componenthub_mcp/providers/jlcsearch.py (keyless, name "lcsc").
 */
import { Capability } from "../models";
import { Provider } from "./base";

export class LcscProvider extends Provider {
  readonly name = "lcsc";
  readonly displayName = "LCSC / JLCSearch";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.CAD_MODELS,
  ]);

  isConfigured(): boolean {
    return false; // stub until ported
  }

  missingConfig(): string | null {
    return "LCSC provider port pending (no API key required once implemented).";
  }
}
