"use server";

import { redirect } from "next/navigation";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { generateAuthCode, hashToken, AUTH_CODE_TTL_MS } from "@/lib/domain/oauth";

/**
 * Submitted from the /oauth/authorize consent form (bound to a staged
 * mcp_oauth_authz_requests row id — see app/oauth/authorize/page.tsx). On
 * "allow", mints a one-time code and redirects back to the client's
 * redirect_uri; on "deny", redirects with error=access_denied.
 */
export async function confirmAuthorization(
  requestId: string,
  decision: "allow" | "deny",
  _formData: FormData,
): Promise<void> {
  if (!isServiceRoleConfigured()) redirect("/oauth/authorize?error=server_error");
  const admin = createAdminClient();

  const { data: staged } = await admin
    .from("mcp_oauth_authz_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!staged || new Date(staged.expires_at).getTime() < Date.now()) {
    redirect("/oauth/authorize?error=request_expired");
  }

  // One-shot: consume the staged request regardless of the outcome.
  await admin.from("mcp_oauth_authz_requests").delete().eq("id", requestId);

  const redirectUrl = new URL(staged.redirect_uri);
  if (staged.state) redirectUrl.searchParams.set("state", staged.state);

  if (decision === "deny") {
    redirectUrl.searchParams.set("error", "access_denied");
    redirect(redirectUrl.toString());
  }

  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent("/oauth/authorize")}`);

  const code = generateAuthCode();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();
  const { error } = await admin.from("mcp_oauth_codes").insert({
    code_hash: hashToken(code),
    client_id: staged.client_id,
    user_id: user.id,
    redirect_uri: staged.redirect_uri,
    code_challenge: staged.code_challenge,
    code_challenge_method: staged.code_challenge_method,
    scope: staged.scope,
    expires_at: expiresAt,
  });
  if (error) {
    redirectUrl.searchParams.set("error", "server_error");
    redirect(redirectUrl.toString());
  }

  redirectUrl.searchParams.set("code", code);
  redirect(redirectUrl.toString());
}
