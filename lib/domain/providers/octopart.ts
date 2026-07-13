/**
 * STUB — replaced by the "providers: octopart + snapmagic + ultralibrarian" unit.
 * Ports componenthub_mcp/providers/octopart.py (Nexar GraphQL, OAuth2).
 */
import { nexarClientId, nexarClientSecret } from "../config";
import { Capability } from "../models";
import { Provider } from "./base";

export class OctopartProvider extends Provider {
  readonly name = "octopart";
  readonly displayName = "Octopart (via Nexar)";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(nexarClientId() && nexarClientSecret());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET with the Supply scope (nexar.com).";
  }
}
