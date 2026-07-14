import { NextResponse } from "next/server";
import { allProviders } from "@/lib/domain/providers/registry";

export const runtime = "nodejs";

/** Mirrors the MCP list_providers tool. */
export async function GET() {
  const providers = [...allProviders().values()].map((p) => {
    const missing = p.missingConfig();
    return {
      name: p.name,
      display_name: p.displayName,
      capabilities: [...p.capabilities].sort(),
      configured: p.isConfigured(),
      ...(missing ? { how_to_enable: missing } : {}),
    };
  });
  return NextResponse.json({ providers });
}
