import { NextResponse } from "next/server";
import { getProvider, ProviderError } from "@/lib/domain/providers/registry";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string; partId: string }> },
) {
  const { provider, partId } = await params;
  const id = decodeURIComponent(partId);
  try {
    const url = await getProvider(provider).fetchDatasheet(id);
    return NextResponse.json({ part_id: id, provider, datasheet_url: url });
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
