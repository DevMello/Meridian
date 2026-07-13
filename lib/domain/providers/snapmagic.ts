/**
 * STUB — replaced by the "providers: octopart + snapmagic + ultralibrarian" unit.
 * Ports componenthub_mcp/providers/snapmagic.py (SnapEDA token).
 */
import { snapmagicToken } from "../config";
import { Capability } from "../models";
import { Provider } from "./base";

export class SnapMagicProvider extends Provider {
  readonly name = "snapmagic";
  readonly displayName = "SnapMagic (SnapEDA)";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.CAD_MODELS,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(snapmagicToken());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set SNAPMAGIC_TOKEN (snapeda.com/api).";
  }
}
