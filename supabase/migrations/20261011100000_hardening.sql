-- Security hardening after review: reputation ledger, cross-object checks,
-- media URL allow-list, banned users, notification dedupe, strain report uniqueness,
-- trusted auto-hide.

-- can_post: not banned AND accepted 18+/terms
create or replace function private.can_post() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_banned and accepted_terms_at is not null)
$$;

-- ── Reputation ledger: every point is granted once and can be revoked ──
create table public.reputation_events (
  user_id uuid not null references public.profiles on delete cascade,
  source_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  ref_id uuid not null,
  points int not null,
  created_at timestamptz not null default now(),
  primary key (kind, ref_id, source_id)
);
alter table public.reputation_events enable row level security;
create policy "own reputation events" on public.reputation_events for select using (user_id = auth.uid());

create or replace function private.grant_rep(target uuid, source uuid, k text, ref uuid, pts int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target is null or source is null or target = source then return; end if;
  insert into reputation_events (user_id, source_id, kind, ref_id, points) values (target, source, k, ref, pts)
  on conflict do nothing;
  if found then update profiles set reputation = reputation + pts where id = target; end if;
end $$;

create or replace function private.revoke_rep(source uuid, k text, ref uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e reputation_events;
begin
  delete from reputation_events where kind = k and ref_id = ref and source_id = source returning * into e;
  if e.user_id is not null then update profiles set reputation = greatest(reputation - e.points, 0) where id = e.user_id; end if;
end $$;

-- notifications: skip duplicates of the same event within a day
create or replace function public.notify(target uuid, actor uuid, kind text, p uuid, c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target is null or target = actor then return; end if;
  if exists (select 1 from blocks where blocker_id = target and blocked_id = actor) then return; end if;
  if kind in ('like', 'follow', 'accepted', 'tip_vote') and exists (
    select 1 from notifications where user_id = target and actor_id = actor and type = kind
      and post_id is not distinct from p and created_at > now() - interval '1 day') then return; end if;
  insert into notifications (user_id, actor_id, type, post_id, comment_id) values (target, actor, kind, p, c);
end $$;

create or replace function public.on_post_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = new.post_id returning author_id into author;
    perform private.grant_rep(author, new.user_id, 'like', new.post_id, 1);
    perform notify(author, new.user_id, 'like', new.post_id, null);
  else
    update posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    perform private.revoke_rep(old.user_id, 'like', old.post_id);
  end if;
  return null;
end $$;

create or replace function public.on_accept() returns trigger
language plpgsql security definer set search_path = public as $$
declare answer_author uuid;
begin
  if new.accepted_comment_id is not distinct from old.accepted_comment_id then return new; end if;
  -- previous best answer loses its points
  perform private.revoke_rep(new.author_id, 'accepted', new.id);
  if new.accepted_comment_id is not null then
    select author_id into answer_author from comments where id = new.accepted_comment_id;
    perform private.grant_rep(answer_author, new.author_id, 'accepted', new.id, 5);
    perform notify(answer_author, new.author_id, 'accepted', new.id, new.accepted_comment_id);
  end if;
  return new;
end $$;

create or replace function public.on_tip_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  foreach t in array array[coalesce(new.tip_id, old.tip_id), old.tip_id] loop
    continue when t is null;
    update tips set
      helpful_count = (select count(*) from tip_votes where tip_id = t and value = 1),
      unhelpful_count = (select count(*) from tip_votes where tip_id = t and value = -1)
    where id = t;
    update tips set score = wilson(helpful_count, unhelpful_count) where id = t;
  end loop;
  if tg_op in ('DELETE', 'UPDATE') then perform private.revoke_rep(old.user_id, 'tip', old.tip_id); end if;
  if tg_op in ('INSERT', 'UPDATE') and new.value = 1 then
    perform private.grant_rep((select author_id from tips where id = new.tip_id), new.user_id, 'tip', new.tip_id, 2);
  end if;
  return null;
end $$;

-- ── Cross-object integrity ──
create or replace function private.media_url_ok(url text, owner uuid) returns boolean
language sql immutable as $$
  select url is null or url like 'https://mlvpmiwvuxgwjssrtxsq.supabase.co/storage/v1/object/public/media/' || owner::text || '/%'
$$;

create or replace function public.check_refs() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); img text;
begin
  if uid is null or private.is_admin() or pg_trigger_depth() > 1 then return new; end if;
  if tg_table_name = 'posts' then
    if new.plant_id is not null and not exists (select 1 from public_plants where id = new.plant_id and owner_id = uid) then
      raise exception 'plant does not belong to you';
    end if;
    foreach img in array new.images loop
      if not private.media_url_ok(img, uid) then raise exception 'images must be uploaded to your own media folder'; end if;
    end loop;
    if pg_column_size(new.plant_context) > 4000 then raise exception 'plant context too large'; end if;
  elsif tg_table_name = 'comments' then
    if tg_op = 'UPDATE' then
      new.post_id := old.post_id; new.parent_id := old.parent_id; new.created_at := old.created_at;
    elsif new.parent_id is not null and not exists (select 1 from comments where id = new.parent_id and post_id = new.post_id) then
      raise exception 'reply must belong to the same post';
    end if;
  elsif tg_table_name = 'challenge_entries' then
    if tg_op = 'UPDATE' then
      new.challenge_id := old.challenge_id; new.user_id := old.user_id; new.created_at := old.created_at;
      if new.image_url is distinct from old.image_url or new.plant_id is distinct from old.plant_id then
        if exists (select 1 from challenges where id = new.challenge_id and now() > ends_at) then raise exception 'entries are closed'; end if;
        delete from challenge_votes where entry_id = new.id;
        new.votes_count := 0;
      end if;
    end if;
    if new.plant_id is not null and not exists (select 1 from public_plants where id = new.plant_id and owner_id = uid) then
      raise exception 'plant does not belong to you';
    end if;
    if not private.media_url_ok(new.image_url, uid) then raise exception 'image must be uploaded to your own media folder'; end if;
  elsif tg_table_name = 'strain_reports' then
    if new.plant_id is not null and not exists (select 1 from public_plants where id = new.plant_id and owner_id = uid) then
      raise exception 'plant does not belong to you';
    end if;
  elsif tg_table_name = 'public_plants' then
    if not private.media_url_ok(new.cover_url, uid) then raise exception 'cover must be uploaded to your own media folder'; end if;
    if pg_column_size(new.timeline) > 60000 then raise exception 'timeline too large'; end if;
  elsif tg_table_name = 'profiles' then
    if new.avatar_url is not null and not private.media_url_ok(new.avatar_url, uid)
      and new.avatar_url not like 'https://lh3.googleusercontent.com/%' then
      raise exception 'avatar must be uploaded to your own media folder';
    end if;
  elsif tg_table_name = 'tip_votes' and tg_op = 'UPDATE' then
    new.tip_id := old.tip_id; new.user_id := old.user_id;
  end if;
  return new;
end $$;

create trigger posts_refs before insert or update on public.posts for each row execute function public.check_refs();
create trigger comments_refs before insert or update on public.comments for each row execute function public.check_refs();
create trigger entries_refs before insert or update on public.challenge_entries for each row execute function public.check_refs();
create trigger strain_reports_refs before insert or update on public.strain_reports for each row execute function public.check_refs();
create trigger plants_refs before insert or update on public.public_plants for each row execute function public.check_refs();
create trigger profiles_refs before update on public.profiles for each row execute function public.check_refs();
create trigger tip_votes_refs before update on public.tip_votes for each row execute function public.check_refs();

-- accepted answer must be a comment on this post by someone else
create or replace function public.check_accept() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.accepted_comment_id is not null and new.accepted_comment_id is distinct from old.accepted_comment_id
    and not exists (select 1 from comments where id = new.accepted_comment_id and post_id = new.id
      and author_id is distinct from new.author_id and not is_ai) then
    raise exception 'best answer must be another user''s comment on this post';
  end if;
  return new;
end $$;
create trigger posts_accept_check before update of accepted_comment_id on public.posts for each row execute function public.check_accept();

-- one grow report per strain per user when no plant is linked
create unique index strain_reports_one_unlinked on public.strain_reports (strain_id, user_id) where plant_id is null;

-- ── Banned / unaccepted users cannot edit or report ──
alter policy "own posts update" on public.posts using ((author_id = auth.uid() and private.can_post()) or private.is_admin());
alter policy "own comments update" on public.comments using ((author_id = auth.uid() and private.can_post()) or private.is_admin());
alter policy "own tips update" on public.tips using ((author_id = auth.uid() and private.can_post()) or private.is_admin());
alter policy "own plants update" on public.public_plants using ((owner_id = auth.uid() and private.can_post()) or private.is_admin());
alter policy "own entries update" on public.challenge_entries using ((user_id = auth.uid() and private.can_post()) or private.is_admin());
alter policy "own strain reports update" on public.strain_reports using (user_id = auth.uid() and private.can_post());
alter policy "own reports" on public.reports with check (reporter_id = auth.uid() and private.can_post());

-- ── More rate limits ──
create trigger likes_rate before insert on public.post_likes for each row execute function public.rate_limit('user_id', '200');
create trigger follows_rate before insert on public.follows for each row execute function public.rate_limit('follower_id', '60');
create trigger strains_rate before insert on public.strains for each row execute function public.rate_limit('created_by', '5');
create trigger strain_reports_rate before insert on public.strain_reports for each row execute function public.rate_limit('user_id', '10');

-- ── Auto-hide only counts trusted reporters (account ≥ 3 days, not banned) ──
create or replace function public.on_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(distinct r.reporter_id) into n from reports r join profiles p on p.id = r.reporter_id
    where r.target_type = new.target_type and r.target_id = new.target_id and r.status = 'open'
      and not p.is_banned and (p.created_at < now() - interval '3 days' or p.reputation >= 10 or p.is_admin);
  if n >= 3 or private.is_admin() then
    case new.target_type
      when 'post' then update posts set is_hidden = true where id = new.target_id;
      when 'comment' then update comments set is_hidden = true where id = new.target_id;
      when 'tip' then update tips set is_hidden = true where id = new.target_id;
      when 'plant' then update public_plants set is_hidden = true where id = new.target_id;
      when 'entry' then update challenge_entries set is_hidden = true where id = new.target_id;
      else null;
    end case;
  end if;
  return null;
end $$;

-- comments of hidden posts stay hidden too
alter policy "comments readable" on public.comments using (
  (not is_hidden and exists (select 1 from public.posts p where p.id = post_id and not p.is_hidden))
  or author_id = auth.uid() or private.is_admin());

-- moderation flags are not public
revoke select (is_banned, accepted_terms_at) on public.profiles from anon;

do $$
declare f text;
begin
  foreach f in array array['public.check_refs()', 'public.check_accept()', 'public.on_post_like()', 'public.on_accept()',
    'public.on_tip_vote()', 'public.notify(uuid, uuid, text, uuid, uuid)', 'public.on_report()',
    'private.grant_rep(uuid, uuid, text, uuid, int)', 'private.revoke_rep(uuid, text, uuid)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;
