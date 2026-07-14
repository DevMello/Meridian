import { gatherAssets, FORMAT_LABELS } from "@/lib/domain/export";
import { ExportFormat } from "@/lib/domain/models";
import { getProvider, ProviderError } from "@/lib/domain/providers/registry";

export const runtime = "nodejs";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Browser-facing export picker (KiCad / Altium / EasyEDA / Fusion 360). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string; partId: string }> },
) {
  const { provider: providerName, partId } = await params;
  const id = decodeURIComponent(partId);

  let displayName: string;
  try {
    displayName = getProvider(providerName).displayName;
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : String(e);
    return new Response(msg, { status: 404 });
  }

  const { assets, datasheet } = await gatherAssets(providerName, id);

  const buttons = Object.entries(FORMAT_LABELS)
    .map(
      ([fmt, label]) =>
        `<a class="btn" href="/api/export/${esc(providerName)}/${esc(id)}/download?fmt=${fmt}">Export for ${esc(label)}</a>`,
    )
    .join("");

  const assetRows =
    assets
      .map(
        (a) =>
          `<tr><td>${esc(a.kind)}</td><td>${esc(a.format)}</td><td><a href="${esc(a.url)}">${esc(a.filename)}</a></td></tr>`,
      )
      .join("") || `<tr><td colspan="3">No CAD assets reported by this provider.</td></tr>`;

  const datasheetHtml = datasheet
    ? `<p>Datasheet: <a href="${esc(datasheet)}">${esc(datasheet)}</a></p>`
    : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Export ${esc(id)} — Meridian</title>
<style>
 body { font-family: system-ui, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1rem; color: #e4e8ea; background:#0b0d0e; }
 h1 { font-size: 1.4rem; } .prov { color: #96a0a6; }
 .btn { display: inline-block; margin: .4rem .5rem .4rem 0; padding: .6rem 1.1rem; background: #3e6ff0; color: #fff; text-decoration: none; border-radius: 2px; }
 .btn:hover { background: #6591ff; }
 table { border-collapse: collapse; margin-top: 1rem; width: 100%; }
 td, th { border: 1px solid #2b3234; padding: .45rem .6rem; text-align: left; font-size: .9rem; }
 a { color:#6591ff; }
</style></head><body>
<h1>Meridian Export — ${esc(id)}</h1>
<p class="prov">Provider: ${esc(displayName)} · ${Object.keys(ExportFormat).length} tools</p>
<p>Choose your PCB tool. Meridian bundles all available files for that format into a single download. Nothing is stored.</p>
${buttons}
${datasheetHtml}
<h2 style="font-size:1.05rem">Available assets</h2>
<table><tr><th>Kind</th><th>Format</th><th>File</th></tr>${assetRows}</table>
</body></html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
