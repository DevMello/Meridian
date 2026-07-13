/**
 * STUB — replaced by the "providers: digikey + mouser" work unit.
 * Ports componenthub_mcp/providers/digikey.py (OAuth2 client credentials).
 */
import { digikeyClientId, digikeyClientSecret } from "../config";
import { Capability } from "../models";
import { Provider } from "./base";

export class DigiKeyProvider extends Provider {
  readonly name = "digikey";
  readonly displayName = "DigiKey";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(digikeyClientId() && digikeyClientSecret());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET (developer.digikey.com).";
  }
}
