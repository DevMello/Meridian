import { NextResponse } from "next/server";
import { baseUrl } from "@/lib/domain/config";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

/** RFC 8414 authorization server metadata, discovered via the issuer URL
 * listed in /.well-known/oauth-protected-resource's authorization_servers. */
export async function GET() {
  const origin = baseUrl();
  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
      scopes_supported: ["mcp", "offline_access"],
    },
    { headers: { ...corsHeaders, "Cache-Control": "max-age=3600" } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
