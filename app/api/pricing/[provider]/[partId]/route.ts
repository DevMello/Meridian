import { NextResponse } from "next/server";
import { excludeNone } from "@/lib/domain/models";
import { getProvider, ProviderError } from "@/lib/domain/providers/registry";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string; partId: string }> },
) {
  const { provider, partId } = await params;
  try {
    const offer = await getProvider(provider).fetchPricing(decodeURIComponent(partId));
    return NextResponse.json(excludeNone(offer));
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
