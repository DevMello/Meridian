import { buildExportZip } from "@/lib/domain/export";
import { ExportFormat } from "@/lib/domain/models";
import { ProviderError } from "@/lib/domain/providers/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Streams a zip of the chosen format's assets + a MANIFEST. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string; partId: string }> },
) {
  const { provider, partId } = await params;
  const id = decodeURIComponent(partId);
  const fmtRaw = new URL(req.url).searchParams.get("fmt");

  const fmt = Object.values(ExportFormat).find((f) => f === fmtRaw);
  if (!fmt) {
    return new Response(`Unknown format ${fmtRaw}`, { status: 400 });
  }

  try {
    const result = await buildExportZip(provider, id, fmt);
    if (!result) {
      return new Response(`No exportable assets for ${id} in ${fmt}`, { status: 404 });
    }
    return new Response(new Uint8Array(result.zip), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : String(e);
    return new Response(msg, { status: 400 });
  }
}
