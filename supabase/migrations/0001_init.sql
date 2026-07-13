-- Meridian schema — auth-backed persistence for the web app.
-- Search/pricing/CAD data itself is never stored; only user artifacts are.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- saved_parts: bookmarked components
-- ---------------------------------------------------------------------------
create table if not exists public.saved_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  part_id text not null,
  mpn text not null,
  manufacturer text,
  description text,
  data jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, provider, part_id)
);
create index if not exists saved_parts_user_idx on public.saved_parts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- search_history: query log (never stores component data)
-- ---------------------------------------------------------------------------
create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  providers text[] not null default '{}',
  result_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists search_history_user_idx on public.search_history (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- projects + bom_lines
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  rev text not null default 'A',
  status text not null default 'draft',
  description text,
  link text,
  build_qty int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id, updated_at desc);

create table if not exists public.bom_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  ref text,
  qty_per_board int not null default 1,
  mpn text not null,
  provider text,
  part_id text,
  description text,
  unit_price numeric,
  sourcing text not null default 'unknown',
  data jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists bom_lines_project_idx on public.bom_lines (project_id, position);

-- ---------------------------------------------------------------------------
-- provider_prefs: per-user enabled/disabled sources
-- ---------------------------------------------------------------------------
create table if not exists public.provider_prefs (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  enabled boolean not null default true,
  primary key (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: users see and mutate only their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.saved_parts enable row level security;
alter table public.search_history enable row level security;
alter table public.projects enable row level security;
alter table public.bom_lines enable row level security;
alter table public.provider_prefs enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own saved_parts" on public.saved_parts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own search_history" on public.search_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own bom_lines" on public.bom_lines
  for all using (
    exists (select 1 from public.projects p where p.id = bom_lines.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = bom_lines.project_id and p.user_id = auth.uid())
  );

create policy "own provider_prefs" on public.provider_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
