/**
 * STUB — replaced by the "providers: digikey + mouser" work unit.
 * Ports componenthub_mcp/providers/mouser.py (API key).
 */
import { mouserApiKey } from "../config";
import { Capability } from "../models";
import { Provider } from "./base";

export class MouserProvider extends Provider {
  readonly name = "mouser";
  readonly displayName = "Mouser Electronics";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(mouserApiKey());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set MOUSER_API_KEY (mouser.com/api-hub).";
  }
}
