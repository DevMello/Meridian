/**
 * Export helpers — TS port of export.py's asset gathering + zip bundling.
 * The route handlers (app/api/export/**) are added by the export work unit;
 * this module provides the reusable logic.
 */
import { zipSync, strToU8 } from "fflate";
import { type CadAsset, ExportFormat } from "./models";
import { getProvider, ProviderError } from "./providers/registry";

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  [ExportFormat.KICAD]: "KiCad",
  [ExportFormat.ALTIUM]: "Altium Designer",
  [ExportFormat.EASYEDA]: "EasyEDA",
  [ExportFormat.FUSION360]: "Fusion 360",
};

export async function gatherAssets(
  providerName: string,
  partId: string,
): Promise<{ assets: CadAsset[]; datasheet: string | null }> {
  const provider = getProvider(providerName);
  let assets: CadAsset[] = [];
  let datasheet: string | null = null;
  try {
    assets = await provider.fetchModels(partId);
  } catch (e) {
    if (!(e instanceof ProviderError)) throw e;
  }
  try {
    datasheet = await provider.fetchDatasheet(partId);
  } catch (e) {
    if (!(e instanceof ProviderError)) throw e;
  }
  return { assets, datasheet };
}

/**
 * Fetch the chosen assets live and bundle them into a zip for the target tool.
 * HTML pages (e.g. provider part pages) are kept as manifest links, not files.
 */
export async function buildExportZip(
  providerName: string,
  partId: string,
  fmt: ExportFormat,
): Promise<{ zip: Uint8Array; filename: string } | null> {
  const { assets, datasheet } = await gatherAssets(providerName, partId);
  const chosen = assets.filter((a) => a.format === fmt || a.format === "universal");
  if (chosen.length === 0 && !datasheet) return null;

  const files: Record<string, Uint8Array> = {};
  const manifest: string[] = [
    `ComponentHub export for ${partId}`,
    `Provider: ${providerName}`,
    `Target tool: ${FORMAT_LABELS[fmt]}`,
    "",
  ];

  for (const asset of chosen) {
    try {
      const resp = await fetch(asset.url, { redirect: "follow" });
      const contentType = resp.headers.get("content-type") ?? "";
      if (resp.ok && !contentType.includes("text/html")) {
        files[asset.filename] = new Uint8Array(await resp.arrayBuffer());
        manifest.push(`[bundled] ${asset.filename} (${asset.kind})`);
      } else {
        manifest.push(`[link]    ${asset.kind}: ${asset.url}`);
      }
    } catch {
      manifest.push(`[link]    ${asset.kind}: ${asset.url}`);
    }
  }
  if (datasheet) manifest.push(`[link]    datasheet: ${datasheet}`);

  files["MANIFEST.txt"] = strToU8(manifest.join("\n") + "\n");
  const zip = zipSync(files, { level: 6 });
  return { zip, filename: `${partId}_${fmt}_componenthub.zip` };
}
