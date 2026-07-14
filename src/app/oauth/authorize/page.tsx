import { redirect } from "next/navigation";
import { Panel, Button } from "@/components/meridian";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { AUTHZ_REQUEST_TTL_MS } from "@/lib/domain/oauth";
import { confirmAuthorization } from "@/lib/data/mcpOAuthConsent";

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <Panel corners className="mx-auto mt-16 max-w-md p-8">
      <p className="sub m-0">{message}</p>
    </Panel>
  );
}

/**
 * OAuth consent screen for the "Add custom connector" flow. Validates the
 * authorization request against a registered mcp_oauth_clients row, stages
 * it in mcp_oauth_authz_requests (so the consent form only carries an opaque
 * id, never trusting resubmitted client_id/redirect_uri/code_challenge from
 * the browser), then requires sign-in before rendering Allow/Deny.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const clientId = first(params.client_id);
  const redirectUri = first(params.redirect_uri);
  const responseType = first(params.response_type);
  const codeChallenge = first(params.code_challenge);
  const codeChallengeMethod = first(params.code_challenge_method) ?? "S256";
  const scope = first(params.scope);
  const state = first(params.state);

  if (!isServiceRoleConfigured()) {
    return <ErrorPanel message="OAuth is not configured for this deployment." />;
  }
  if (
    !clientId ||
    !redirectUri ||
    responseType !== "code" ||
    !codeChallenge ||
    codeChallengeMethod !== "S256"
  ) {
    return <ErrorPanel message="Invalid or incomplete authorization request." />;
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("mcp_oauth_clients")
    .select("client_id, client_name, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client || !(client.redirect_uris as string[]).includes(redirectUri)) {
    return <ErrorPanel message="Unknown client or unregistered redirect URI." />;
  }

  const user = await getUser();
  if (!user) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v);
    }
    redirect(`/sign-in?next=${encodeURIComponent(`/oauth/authorize?${qs.toString()}`)}`);
  }

  const expiresAt = new Date(Date.now() + AUTHZ_REQUEST_TTL_MS).toISOString();
  const { data: staged, error } = await admin
    .from("mcp_oauth_authz_requests")
    .insert({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope: scope ?? null,
      state: state ?? null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !staged) {
    return <ErrorPanel message="Couldn't start the authorization request. Try again." />;
  }

  const redirectHost = new URL(redirectUri).host;
  const allow = confirmAuthorization.bind(null, staged.id, "allow");
  const deny = confirmAuthorization.bind(null, staged.id, "deny");

  return (
    <Panel corners className="mx-auto mt-16 max-w-md p-8">
      <h1 className="mb-2 text-lg font-semibold">Authorize {client.client_name ?? "this app"}</h1>
      <p className="sub mb-6">
        Signed in as {user.email}. Allowing this will let{" "}
        <strong className="text-ink">{redirectHost}</strong> search components, pull pricing and
        CAD data, and read export links through your Meridian account.
      </p>
      <div className="flex gap-3">
        <form action={allow}>
          <Button variant="pri" type="submit">
            Allow
          </Button>
        </form>
        <form action={deny}>
          <Button type="submit">Deny</Button>
        </form>
      </div>
    </Panel>
  );
}
