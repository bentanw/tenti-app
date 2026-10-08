-- Tenti schema: Notion-style databases, transcripts, link-in-bio.
-- Every row belongs to a user (auth.users). Row-level security limits each user to their own rows;
-- the public link page and click tracking go through two security-definer functions at the bottom.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Notion: databases → properties (columns) + pages (rows) ─────────────────

create table public.databases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  icon        text not null default '📄',
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index databases_user_id_idx on public.databases (user_id);

create table public.properties (
  id          uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('TEXT', 'NUMBER', 'SELECT', 'DATE', 'CHECKBOX', 'URL')),
  -- SELECT only: [{ id, name, color }]
  options     jsonb not null default '[]',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index properties_database_id_idx on public.properties (database_id);

create table public.pages (
  id          uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default '',
  icon        text,
  -- { [propertyId]: value }
  "values"    jsonb not null default '{}',
  -- BlockNote document (array of blocks)
  content     jsonb,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index pages_database_id_idx on public.pages (database_id);

-- ─── Otter: transcripts ──────────────────────────────────────────────────────

create table public.transcripts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  -- original file name or URL
  source       text not null,
  status       text not null default 'PROCESSING' check (status in ('PROCESSING', 'DONE', 'FAILED')),
  error        text,
  language     text,
  duration_sec double precision,
  text         text not null default '',
  -- [{ start, end, text }] in seconds
  segments     jsonb not null default '[]',
  page_id      uuid references public.pages (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index transcripts_user_id_idx on public.transcripts (user_id);

-- ─── Linktree: one public profile per user ───────────────────────────────────

create table public.link_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  handle       text not null unique check (handle ~ '^[a-z0-9_.-]{2,30}$'),
  display_name text not null,
  bio          text,
  avatar_url   text,
  theme        text not null default 'midnight',
  views        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.links (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.link_profiles (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  url        text not null,
  enabled    boolean not null default true,
  clicks     integer not null default 0,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index links_profile_id_idx on public.links (profile_id);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

create trigger databases_updated_at before update on public.databases
  for each row execute function public.set_updated_at();
create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();
create trigger transcripts_updated_at before update on public.transcripts
  for each row execute function public.set_updated_at();
create trigger link_profiles_updated_at before update on public.link_profiles
  for each row execute function public.set_updated_at();

-- ─── Row-level security ──────────────────────────────────────────────────────

alter table public.databases     enable row level security;
alter table public.properties    enable row level security;
alter table public.pages         enable row level security;
alter table public.transcripts   enable row level security;
alter table public.link_profiles enable row level security;
alter table public.links         enable row level security;

-- Owner-only access. Child rows must also point at a parent the user owns.
create policy "own databases" on public.databases
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own properties" on public.properties
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.databases d where d.id = database_id and d.user_id = (select auth.uid()))
  );

create policy "own pages" on public.pages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.databases d where d.id = database_id and d.user_id = (select auth.uid()))
  );

create policy "own transcripts" on public.transcripts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (page_id is null or exists (select 1 from public.pages p where p.id = page_id and p.user_id = (select auth.uid())))
  );

-- Link pages are public: anyone can read profiles and enabled links; only the owner can change them.
create policy "public profiles are readable" on public.link_profiles
  for select to anon, authenticated
  using (true);

create policy "own profile insert" on public.link_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "own profile update" on public.link_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own profile delete" on public.link_profiles
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "enabled links are readable" on public.links
  for select to anon, authenticated
  using (enabled or user_id = (select auth.uid()));

create policy "own links insert" on public.links
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.link_profiles lp where lp.id = profile_id and lp.user_id = (select auth.uid()))
  );

create policy "own links update" on public.links
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own links delete" on public.links
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── Public counters (visitors aren't signed in, so RLS would block these updates) ─

create or replace function public.record_profile_view(p_handle text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.link_profiles set views = views + 1 where handle = p_handle;
$$;

-- Counts a click and returns the destination URL (null if the link doesn't exist or is disabled).
create or replace function public.track_link_click(p_link_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  update public.links set clicks = clicks + 1 where id = p_link_id and enabled returning url;
$$;

revoke all on function public.record_profile_view(text) from public;
revoke all on function public.track_link_click(uuid) from public;
grant execute on function public.record_profile_view(text) to anon, authenticated;
grant execute on function public.track_link_click(uuid) to anon, authenticated;
