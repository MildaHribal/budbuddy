-- Hardening: trust only server roles (L1), media upload caps (M2), content filter coverage (M3),
-- strain photos admin-only (M4), hidden challenge votes in the base table (L2), safer new-user profile (L3).

-- ── L1: trusted = service role / no JWT (SQL editor, cron, auth), nested triggers, internal jobs ──
-- The anon role (no auth.uid() either) is no longer trusted.
create or replace function private.trusted() returns boolean
language sql stable set search_path = '' as $$
  select pg_trigger_depth() > 1
    or coalesce(current_setting('budbuddy.trusted', true), '') = 'on'
    or coalesce(auth.role(), '') = 'service_role'
    or (auth.role() is null and session_user::text <> 'authenticator')
$$;
revoke execute on function private.trusted() from public, anon, authenticated;

-- same trust rule for the content filter (was: auth.uid() is null)
create or replace function public.check_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  col text; v text; o text; why text;
begin
  if private.trusted() then return new; end if;
  foreach col in array tg_argv loop
    v := to_jsonb(new) ->> col;
    if tg_op = 'UPDATE' then
      o := to_jsonb(old) ->> col;
      continue when v is not distinct from o;
    end if;
    why := private.content_violation(v);
    if why is not null then
      raise exception 'content_blocked:%', why using errcode = 'P0001', hint = col;
    end if;
  end loop;
  return new;
end $$;
revoke execute on function public.check_content() from public, anon, authenticated;

-- ── M2: at most 100 uploads per hour and 2000 files per user in the media bucket ──
create or replace function private.media_upload_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and (select count(*) from storage.objects o where o.bucket_id = 'media'
      and o.name like auth.uid()::text || '/%' and o.created_at > now() - interval '1 hour') < 100
    and (select count(*) from storage.objects o where o.bucket_id = 'media'
      and o.name like auth.uid()::text || '/%') < 2000
$$;
revoke all on function private.media_upload_ok() from public, anon;
grant execute on function private.media_upload_ok() to authenticated;

alter policy "media upload own folder" on storage.objects with check (
  bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  and private.can_post() and private.media_upload_ok());

-- ── M3: content filter on more user text ──
drop trigger if exists profiles_content on public.profiles;
create trigger profiles_content before update on public.profiles
  for each row execute function public.check_content('bio', 'display_name', 'favorite_strain');
drop trigger if exists posts_content on public.posts;
create trigger posts_content before insert or update on public.posts
  for each row execute function public.check_content('title', 'body', 'tags');
drop trigger if exists plants_content on public.public_plants;
create trigger plants_content before insert or update on public.public_plants
  for each row execute function public.check_content('name', 'strain');
drop trigger if exists strains_content on public.strains;
create trigger strains_content before insert or update on public.strains
  for each row execute function public.check_content('name', 'description', 'description_cs');

-- shared plant timeline: summary and note of every item
create or replace function private.check_plant_timeline() returns trigger
language plpgsql security definer set search_path = public as $$
declare why text;
begin
  if private.trusted() then return new; end if;
  if tg_op = 'UPDATE' and new.timeline is not distinct from old.timeline then return new; end if;
  if jsonb_typeof(new.timeline) is distinct from 'array' then raise exception 'timeline must be an array'; end if;
  select v into why
  from jsonb_array_elements(new.timeline) i, lateral private.content_violation(concat_ws(' ', i ->> 'summary', i ->> 'note')) v
  where v is not null
  limit 1;
  if why is not null then
    raise exception 'content_blocked:%', why using errcode = 'P0001', hint = 'timeline';
  end if;
  return new;
end $$;
revoke execute on function private.check_plant_timeline() from public, anon, authenticated;
drop trigger if exists plants_timeline_content on public.public_plants;
create trigger plants_timeline_content before insert or update on public.public_plants
  for each row execute function private.check_plant_timeline();

-- size limits on short free-form columns (the app only sends enum values)
alter table public.public_plants drop constraint if exists public_plants_short_text;
alter table public.public_plants add constraint public_plants_short_text check (
  char_length(stage) <= 40 and char_length(environment) <= 40 and char_length(medium) <= 40
  and char_length(local_id) between 1 and 64) not valid;
alter table public.public_plants validate constraint public_plants_short_text;
alter table public.tips drop constraint if exists tips_short_text;
alter table public.tips add constraint tips_short_text check (
  char_length(stage) <= 40 and char_length(medium) <= 40 and char_length(environment) <= 40) not valid;
alter table public.tips validate constraint tips_short_text;

-- ── M4: only admins (or the service role) set strain photos and approval on insert ──
create or replace function private.strain_insert_sanitize() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.trusted() or private.is_admin() then return new; end if;
  new.image_url := null;
  new.image_credit := null;
  new.approved := false;
  new.created_at := now();
  return new;
end $$;
revoke execute on function private.strain_insert_sanitize() from public, anon, authenticated;
drop trigger if exists strains_sanitize on public.strains;
create trigger strains_sanitize before insert on public.strains
  for each row execute function private.strain_insert_sanitize();

-- ── L2: live vote counts no longer sit in challenge_entries.votes_count ──
-- Old app builds insert entries with .select(votes_count), so the column stays readable; it now
-- holds 0 until finalize_challenge() writes the final counts. The view counts votes itself.
create index if not exists challenge_votes_entry_idx on public.challenge_votes (entry_id);

create or replace function private.entry_votes(entry uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when now() > c.voting_ends_at or private.is_admin() then
    (select count(*)::int from public.challenge_votes v where v.entry_id = e.id) end
  from public.challenge_entries e join public.challenges c on c.id = e.challenge_id
  where e.id = entry
$$;
revoke all on function private.entry_votes(uuid) from public;
grant execute on function private.entry_votes(uuid) to anon, authenticated;

create or replace view public.challenge_entries_public with (security_invoker = true) as
  select e.id, e.challenge_id, e.user_id, e.plant_id, e.image_url, e.caption,
    private.entry_votes(e.id) as votes_count,
    e.is_hidden, e.created_at
  from public.challenge_entries e;
grant select on public.challenge_entries_public to anon, authenticated;

drop trigger if exists challenge_votes_count on public.challenge_votes;
update public.challenge_entries e set votes_count = 0
  from public.challenges c where c.id = e.challenge_id and now() <= c.voting_ends_at and e.votes_count <> 0;

create or replace function public.finalize_challenge(challenge uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  c challenges;
  r record;
  n int := 0;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  select * into c from challenges where id = finalize_challenge.challenge for update;
  if c.id is null then raise exception 'challenge not found'; end if;
  if now() <= c.voting_ends_at then raise exception 'voting is still open'; end if;
  if c.finalized_at is not null then return 0; end if;
  update challenge_entries e set votes_count = (select count(*) from challenge_votes v where v.entry_id = e.id)
    where e.challenge_id = c.id;
  for r in
    select e.user_id, row_number() over (order by e.votes_count desc, e.created_at) as rk
    from challenge_entries e
    where e.challenge_id = c.id and not e.is_hidden and e.votes_count > 0
    order by e.votes_count desc, e.created_at
    limit 3
  loop
    perform private.award_badge(r.user_id, 'challenge_winner');
    insert into notifications (user_id, type, meta)
      values (r.user_id, 'challenge', jsonb_build_object('challenge_id', c.id, 'slug', c.slug, 'rank', r.rk));
    n := n + 1;
  end loop;
  update challenges set finalized_at = now() where id = c.id;
  return n;
end $$;
revoke all on function public.finalize_challenge(uuid) from public, anon;
grant execute on function public.finalize_challenge(uuid) to authenticated;

-- ── L3: new users get a Google avatar only, a clean display name ──
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := lower(regexp_replace(split_part(coalesce(new.email, 'grower'), '@', 1), '[^a-z0-9_]', '', 'gi'));
  handle text;
  dname text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), '[[:cntrl:]]', '', 'g');
  avatar text := new.raw_user_meta_data ->> 'avatar_url';
begin
  base := left(case when char_length(base) < 3 then 'grower' else base end, 14);
  handle := base;
  while exists (select 1 from public.profiles where username = handle) loop
    handle := base || '_' || substr(md5(random()::text), 1, 4);
  end loop;
  dname := left(btrim(dname), 40);
  if dname = '' or private.content_violation(dname) is not null then dname := handle; end if;
  if avatar is null or not starts_with(avatar, 'https://lh3.googleusercontent.com/')
    or char_length(avatar) > 500 or avatar ~ '[[:space:]"''<>\\]' then
    avatar := null;
  end if;
  insert into public.profiles (id, username, display_name, avatar_url) values (new.id, handle, dname, avatar);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
