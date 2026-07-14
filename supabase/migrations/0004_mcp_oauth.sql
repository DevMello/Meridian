-- OAuth 2.1 authorization server for the MCP endpoint, used by Claude's
-- "Add custom connector" dialog (which only supports no-auth or OAuth — not
-- the static Authorization: Bearer header the CLI/JSON-config path uses).
-- Codes and tokens are stored hashed (unlike mcp_api_keys.api_key, which is
-- plaintext because the UI re-displays it) since none of these ever need to
-- be shown to a user again. RLS is enabled with no policies: everything here
-- is server-side OAuth protocol state, written only via the service-role
-- client (never read/written directly by the browser client).

create table if not exists public.mcp_oauth_clients (
  client_id text primary key,
  client_secret_hash text,
  client_name text,
  redirect_uris text[] not null,
  token_endpoint_auth_method text not null default 'client_secret_post',
  created_at timestamptz not null default now()
);

create table if not exists public.mcp_oauth_authz_requests (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.mcp_oauth_clients (client_id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  scope text,
  state text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists mcp_oauth_authz_requests_expires_idx
  on public.mcp_oauth_authz_requests (expires_at);

create table if not exists public.mcp_oauth_codes (
  code_hash text primary key,
  client_id text not null references public.mcp_oauth_clients (client_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  scope text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mcp_oauth_grants (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.mcp_oauth_clients (client_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  access_token_hash text not null unique,
  access_token_expires_at timestamptz not null,
  refresh_token_hash text unique,
  refresh_token_expires_at timestamptz,
  scope text,
  revoked_at timestamptz,
  replaced_by uuid references public.mcp_oauth_grants (id),
  created_at timestamptz not null default now()
);
create index if not exists mcp_oauth_grants_user_idx on public.mcp_oauth_grants (user_id);

alter table public.mcp_oauth_clients enable row level security;
alter table public.mcp_oauth_authz_requests enable row level security;
alter table public.mcp_oauth_codes enable row level security;
alter table public.mcp_oauth_grants enable row level security;
