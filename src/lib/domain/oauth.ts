/**
 * Shared helpers for the MCP OAuth 2.1 authorization server (app/oauth/**,
 * app/api/oauth/**, app/.well-known/**). Token/code values are random,
 * prefixed opaque strings; only their SHA-256 hash is ever persisted.
 */
import { createHash, randomBytes } from "node:crypto";

export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
export const AUTH_CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes
export const AUTHZ_REQUEST_TTL_MS = 10 * 60 * 1000; // 10 minutes

function randomToken(prefix: string, bytes: number): string {
  return `${prefix}${randomBytes(bytes).toString("base64url")}`;
}

export function generateClientId(): string {
  return randomToken("mcp_client_", 16);
}

export function generateClientSecret(): string {
  return randomToken("mcp_secret_", 32);
}

export function generateAuthCode(): string {
  return randomToken("mcp_ac_", 32);
}

export function generateAccessToken(): string {
  return randomToken("mcp_at_", 32);
}

export function generateRefreshToken(): string {
  return randomToken("mcp_rt_", 32);
}

/** SHA-256 hex digest — used to store codes/tokens/secrets non-recoverably. */
export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Verifies a PKCE code_verifier against a stored S256 code_challenge. */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  return computed === codeChallenge;
}
