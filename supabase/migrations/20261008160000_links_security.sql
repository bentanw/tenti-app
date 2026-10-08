-- A link can only be moved onto a profile its owner also owns (the insert policy already checks this;
-- without it here, a user could re-point their own link at someone else's public page).
drop policy "own links update" on public.links;

create policy "own links update" on public.links
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.link_profiles lp where lp.id = profile_id and lp.user_id = (select auth.uid()))
  );

-- Links render as hrefs, so only web URLs (no javascript:, data:, ...). `not valid` skips the check
-- for existing rows but enforces it on every insert/update from now on.
alter table public.links
  add constraint links_url_http check (url ~* '^https?://') not valid;
