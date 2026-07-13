import { demoAssetContent } from "@/lib/domain/providers/demo";

export const runtime = "nodejs";

/** Serves placeholder demo CAD asset content (mirrors export.py demo_asset). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mpn: string; filename: string }> },
) {
  const { mpn, filename } = await params;
  const content = demoAssetContent(decodeURIComponent(mpn), decodeURIComponent(filename));
  if (content === null) {
    return new Response("Unknown demo part", { status: 404 });
  }
  return new Response(content, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
