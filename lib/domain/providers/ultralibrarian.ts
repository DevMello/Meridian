/**
 * STUB — replaced by the "providers: octopart + snapmagic + ultralibrarian" unit.
 * Ports componenthub_mcp/providers/ultralibrarian.py (OAuth2).
 */
import { ultralibrarianClientId, ultralibrarianClientSecret } from "../config";
import { Capability } from "../models";
import { Provider } from "./base";

export class UltraLibrarianProvider extends Provider {
  readonly name = "ultralibrarian";
  readonly displayName = "Ultra Librarian";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.CAD_MODELS,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(ultralibrarianClientId() && ultralibrarianClientSecret());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set ULTRA_LIBRARIAN_CLIENT_ID and ULTRA_LIBRARIAN_CLIENT_SECRET (developers.ultralibrarian.com).";
  }
}
