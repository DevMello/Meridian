import { NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { generateClientId, generateClientSecret, hashToken } from "@/lib/domain/oauth";

export const runtime = "nodejs";

/** RFC 7591 Dynamic Client Registration. Public endpoint — Claude calls this
 * automatically the first time a user adds the connector, no manual setup. */
export async function POST(req: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const redirectUris = body.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    !redirectUris.every((u) => typeof u === "string" && u.startsWith("https://"))
  ) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be a non-empty array of https:// URLs" },
      { status: 400 },
    );
  }

  const requestedAuthMethod = body.token_endpoint_auth_method;
  const authMethod = requestedAuthMethod === "none" ? "none" : "client_secret_post";
  const clientName = typeof body.client_name === "string" ? body.client_name : null;

  const clientId = generateClientId();
  const clientSecret = authMethod === "none" ? null : generateClientSecret();

  const { error } = await createAdminClient().from("mcp_oauth_clients").insert({
    client_id: clientId,
    client_secret_hash: clientSecret ? hashToken(clientSecret) : null,
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: authMethod,
  });
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(
    {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: authMethod,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      ...(clientName ? { client_name: clientName } : {}),
    },
    { status: 201 },
  );
}
