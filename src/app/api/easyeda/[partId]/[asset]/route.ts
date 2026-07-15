import { NextResponse } from "next/server";
import {
  fetchEasyEda3dModel,
  fetchEasyEdaSvgs,
  normalizeLcscCode,
} from "@/lib/domain/easyeda";
import { ProviderError } from "@/lib/domain/providers/base";

export const runtime = "nodejs";

const ASSETS = ["symbol.svg", "footprint.svg", "model.step", "model.obj"] as const;
type AssetName = (typeof ASSETS)[number];

/**
 * Proxies EasyEDA CAD assets for an LCSC part so the detail page can embed
 * them directly (easyeda.com blocks requests without browser headers and
 * sends no CORS headers). Fetched live per request — nothing stored.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ partId: string; asset: string }> },
) {
  const { partId, asset } = await params;
  if (!ASSETS.includes(asset as AssetName)) {
    return NextResponse.json(
      { error: `Unknown asset ${JSON.stringify(asset)}. Available: ${ASSETS.join(", ")}` },
      { status: 404 },
    );
  }
  try {
    const code = normalizeLcscCode(decodeURIComponent(partId));

    if (asset === "symbol.svg" || asset === "footprint.svg") {
      const svgs = await fetchEasyEdaSvgs(code);
      const svg = asset === "symbol.svg" ? svgs.symbol : svgs.footprint;
      if (!svg) {
        return NextResponse.json(
          { error: `No ${asset === "symbol.svg" ? "symbol" : "footprint"} published for ${code}` },
          { status: 404 },
        );
      }
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const kind = asset === "model.step" ? "step" : "obj";
    const model = await fetchEasyEda3dModel(code, kind);
    if (!model) {
      return NextResponse.json({ error: `No 3D model published for ${code}` }, { status: 404 });
    }
    return new NextResponse(model.body, {
      headers: {
        "Content-Type": kind === "step" ? "application/step" : "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${model.filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
