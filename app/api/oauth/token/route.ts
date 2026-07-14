import { NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyPkce,
} from "@/lib/domain/oauth";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

function tokenError(error: string, description?: string, status = 400) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: NO_STORE },
  );
}

type Client = {
  client_id: string;
  client_secret_hash: string | null;
  token_endpoint_auth_method: string;
};

/** Confidential clients (auth method != "none") must present a matching secret. */
function clientAuthenticated(client: Client, clientSecret: string | null): boolean {
  if (client.token_endpoint_auth_method === "none") return true;
  if (!client.client_secret_hash || !clientSecret) return false;
  return hashToken(clientSecret) === client.client_secret_hash;
}

/** RFC 6749 token endpoint. Must accept application/x-www-form-urlencoded
 * (register/DCR uses JSON — different parser). */
export async function POST(req: Request) {
  if (!isServiceRoleConfigured()) return tokenError("server_error", undefined, 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return tokenError("invalid_request", "Expected application/x-www-form-urlencoded body");
  }

  const grantType = form.get("grant_type");
  const clientId = form.get("client_id");
  const clientSecret = form.get("client_secret");

  if (typeof clientId !== "string" || !clientId) {
    return tokenError("invalid_client", "Missing client_id");
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("mcp_oauth_clients")
    .select("client_id, client_secret_hash, token_endpoint_auth_method")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client || !clientAuthenticated(client, typeof clientSecret === "string" ? clientSecret : null)) {
    return tokenError("invalid_client", "Unknown client or bad client_secret");
  }

  if (grantType === "authorization_code") {
    return handleAuthorizationCode(admin, client, form);
  }
  if (grantType === "refresh_token") {
    return handleRefreshToken(admin, client, form);
  }
  return tokenError("unsupported_grant_type", `Unsupported grant_type: ${String(grantType)}`);
}

async function issueGrant(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  userId: string,
  scope: string | null,
  replaces?: string,
) {
  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  const now = Date.now();

  const { data: grant, error } = await admin
    .from("mcp_oauth_grants")
    .insert({
      client_id: clientId,
      user_id: userId,
      access_token_hash: hashToken(accessToken),
      access_token_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
      refresh_token_hash: hashToken(refreshToken),
      refresh_token_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
      scope,
    })
    .select("id")
    .single();

  if (error || !grant) return null;

  if (replaces) {
    await admin
      .from("mcp_oauth_grants")
      .update({ revoked_at: new Date().toISOString(), replaced_by: grant.id })
      .eq("id", replaces);
  }

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: refreshToken,
      ...(scope ? { scope } : {}),
    },
    { headers: NO_STORE },
  );
}

async function handleAuthorizationCode(
  admin: ReturnType<typeof createAdminClient>,
  client: Client,
  form: FormData,
) {
  const code = form.get("code");
  const redirectUri = form.get("redirect_uri");
  const codeVerifier = form.get("code_verifier");

  if (typeof code !== "string" || typeof redirectUri !== "string" || typeof codeVerifier !== "string") {
    return tokenError("invalid_request", "Missing code, redirect_uri, or code_verifier");
  }

  // Atomically claim the code so a replayed request can't double-spend it.
  const { data: claimed } = await admin
    .from("mcp_oauth_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("code_hash", hashToken(code))
    .is("consumed_at", null)
    .select("*")
    .maybeSingle();

  if (!claimed) return tokenError("invalid_grant", "Code already used, unknown, or expired");
  if (new Date(claimed.expires_at).getTime() < Date.now()) {
    return tokenError("invalid_grant", "Code expired");
  }
  if (claimed.client_id !== client.client_id || claimed.redirect_uri !== redirectUri) {
    return tokenError("invalid_grant", "client_id or redirect_uri mismatch");
  }
  if (!verifyPkce(codeVerifier, claimed.code_challenge)) {
    return tokenError("invalid_grant", "PKCE verification failed");
  }

  const result = await issueGrant(admin, client.client_id, claimed.user_id, claimed.scope);
  return result ?? tokenError("server_error", undefined, 500);
}

async function handleRefreshToken(
  admin: ReturnType<typeof createAdminClient>,
  client: Client,
  form: FormData,
) {
  const refreshToken = form.get("refresh_token");
  if (typeof refreshToken !== "string" || !refreshToken) {
    return tokenError("invalid_request", "Missing refresh_token");
  }

  const { data: grant } = await admin
    .from("mcp_oauth_grants")
    .select("*")
    .eq("refresh_token_hash", hashToken(refreshToken))
    .maybeSingle();

  if (
    !grant ||
    grant.revoked_at ||
    grant.client_id !== client.client_id ||
    !grant.refresh_token_expires_at ||
    new Date(grant.refresh_token_expires_at).getTime() < Date.now()
  ) {
    return tokenError("invalid_grant", "Refresh token is invalid, expired, or revoked");
  }

  const result = await issueGrant(admin, client.client_id, grant.user_id, grant.scope, grant.id);
  return result ?? tokenError("server_error", undefined, 500);
}
