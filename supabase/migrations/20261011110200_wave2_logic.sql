-- Wave 2 logic: reactions, help status + 48 h ping, badges, weekly updates, discovery,
-- challenges 2.0 and DB-side bug fixes (M1, M8, M9, L1, L2, L3, L4, L12).

-- ── Trust: service role / SQL editor, nested triggers and internal jobs ──
create or replace function private.trusted() returns boolean
language sql stable set search_path = public as $$
  select auth.uid() is null or pg_trigger_depth() > 1 or coalesce(current_setting('budbuddy.trusted', true), '') = 'on'
$$;

-- ── Notifications with meta + dedupe ──
create or replace function private.notify(target uuid, actor uuid, kind text, p uuid, c uuid, m jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target is null or target = actor then return; end if;
  if actor is not null and exists (select 1 from blocks where blocker_id = target and blocked_id = actor) then return; end if;
  if kind in ('like', 'reaction', 'follow', 'accepted', 'tip_vote') and exists (
    select 1 from notifications where user_id = target and actor_id is not distinct from actor and type = kind
      and post_id is not distinct from p and (kind <> 'tip_vote' or meta is not distinct from m)
      and created_at > now() - interval '1 day') then return; end if;
  insert into notifications (user_id, actor_id, type, post_id, comment_id, meta) values (target, actor, kind, p, c, m);
end $$;

create or replace function public.notify(target uuid, actor uuid, kind text, p uuid, c uuid) returns void
language sql security definer set search_path = public as $$
  select private.notify(target, actor, kind, p, c, null)
$$;

-- ── Badges ──
create or replace function private.award_badge(u uuid, b text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if u is null then return; end if;
  insert into user_badges (user_id, badge_id) values (u, b) on conflict do nothing;
  if found then
    insert into notifications (user_id, type, meta) values (u, 'badge', jsonb_build_object('badge', b));
  end if;
end $$;

-- ── Reactions ──
create or replace function private.on_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = likes_count + 1,
      reactions = jsonb_set(reactions, array[new.kind], to_jsonb(coalesce((reactions ->> new.kind)::int, 0) + 1))
      where id = new.post_id returning author_id into author;
    perform private.grant_rep(author, new.user_id, 'reaction', new.post_id, 1);
    perform private.notify(author, new.user_id, 'reaction', new.post_id, null, jsonb_build_object('kind', new.kind));
  else
    update posts set likes_count = greatest(likes_count - 1, 0),
      reactions = case when coalesce((reactions ->> old.kind)::int, 0) <= 1 then reactions - old.kind
        else jsonb_set(reactions, array[old.kind], to_jsonb((reactions ->> old.kind)::int - 1)) end
      where id = old.post_id;
    if not exists (select 1 from post_reactions where user_id = old.user_id and post_id = old.post_id) then
      perform private.revoke_rep(old.user_id, 'reaction', old.post_id);
    end if;
  end if;
  return null;
end $$;
create trigger post_reactions_count after insert or delete on public.post_reactions
  for each row execute function private.on_reaction();

-- old clients: a post_like is the 'like' reaction
create or replace function public.on_post_like() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into post_reactions (user_id, post_id, kind) values (new.user_id, new.post_id, 'like') on conflict do nothing;
  else
    delete from post_reactions where user_id = old.user_id and post_id = old.post_id and kind = 'like';
  end if;
  return null;
end $$;

-- ── Posts: derived help status, first-post badge ──
create or replace function private.on_post_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.accepted_comment_id is distinct from old.accepted_comment_id then
    new.status := case when new.accepted_comment_id is null then 'open' else 'solved' end;
    new.solved_at := case when new.accepted_comment_id is null then null else now() end;
  else
    new.status := old.status; new.solved_at := old.solved_at;
  end if;
  if not private.trusted() then
    new.pinged_at := case when tg_op = 'INSERT' then null else old.pinged_at end;
  end if;
  return new;
end $$;
create trigger posts_status before insert or update on public.posts
  for each row execute function private.on_post_status();

create or replace function private.on_post_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.award_badge(new.author_id, 'first_post');
  return null;
end $$;
create trigger posts_badges after insert on public.posts for each row execute function private.on_post_created();

-- accepted answer: +5 rep, notification, first_answer / helper_10
create or replace function public.on_accept() returns trigger
language plpgsql security definer set search_path = public as $$
declare answer_author uuid;
begin
  if new.accepted_comment_id is not distinct from old.accepted_comment_id then return new; end if;
  perform private.revoke_rep(new.author_id, 'accepted', new.id);
  if new.accepted_comment_id is not null then
    select author_id into answer_author from comments where id = new.accepted_comment_id;
    if answer_author is not null and answer_author <> new.author_id then
      perform private.grant_rep(answer_author, new.author_id, 'accepted', new.id, 5);
      perform private.notify(answer_author, new.author_id, 'accepted', new.id, new.accepted_comment_id);
      perform private.award_badge(answer_author, 'first_answer');
      if (select count(*) from reputation_events where user_id = answer_author and kind = 'accepted') >= 10 then
        perform private.award_badge(answer_author, 'helper_10');
      end if;
    end if;
  end if;
  return new;
end $$;

-- 48 h nudge: "did an answer help? mark it as solved"
create table private.job_runs (name text primary key, ran_at timestamptz not null);

create or replace function public.ping_unsolved() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- clients may call it opportunistically; run at most every 10 minutes
  if auth.uid() is not null and exists (select 1 from private.job_runs
      where name = 'ping_unsolved' and ran_at > now() - interval '10 minutes') then
    return 0;
  end if;
  insert into private.job_runs values ('ping_unsolved', now()) on conflict (name) do update set ran_at = excluded.ran_at;
  perform set_config('budbuddy.trusted', 'on', true);
  with due as (
    update posts set pinged_at = now()
    where category in ('question', 'problem') and status = 'open' and pinged_at is null and not is_hidden
      and comments_count >= 1 and created_at < now() - interval '48 hours'
    returning id, author_id)
  insert into notifications (user_id, type, post_id) select author_id, 'solve_ping', id from due;
  get diagnostics n = row_count;
  perform set_config('budbuddy.trusted', 'off', true);
  return n;
end $$;
revoke all on function public.ping_unsolved() from public, anon;
grant execute on function public.ping_unsolved() to authenticated;

-- ── Comments: L1 (no duplicate comment+reply), welcome badge ──
create or replace function public.on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p posts;
  parent_author uuid;
begin
  if tg_op = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = new.post_id returning * into p;
    if new.parent_id is not null then
      select author_id into parent_author from comments where id = new.parent_id;
      perform private.notify(parent_author, new.author_id, 'reply', new.post_id, new.id);
    end if;
    if parent_author is distinct from p.author_id then
      perform private.notify(p.author_id, new.author_id, 'comment', new.post_id, new.id);
    end if;
    if new.author_id is not null and new.author_id <> p.author_id
      and not exists (select 1 from user_badges where user_id = new.author_id and badge_id = 'welcome')
      and exists (select 1 from profiles where id = p.author_id and first_grow)
      and (select count(distinct c.post_id) from comments c join posts po on po.id = c.post_id
           join profiles pr on pr.id = po.author_id
           where c.author_id = new.author_id and pr.first_grow and po.author_id <> new.author_id) >= 3 then
      perform private.award_badge(new.author_id, 'welcome');
    end if;
  else
    update posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

-- ── Tips: tip_vote notification + tip_master ──
create or replace function public.on_tip_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare t uuid; author uuid; helpful int;
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
    select author_id, helpful_count into author, helpful from tips where id = new.tip_id;
    perform private.grant_rep(author, new.user_id, 'tip', new.tip_id, 2);
    perform private.notify(author, new.user_id, 'tip_vote', null, null, jsonb_build_object('tip_id', new.tip_id));
    if helpful >= 10 then perform private.award_badge(author, 'tip_master'); end if;
  end if;
  return null;
end $$;

-- ── Public plants: first harvest ends "first grow" ──
create or replace function private.on_plant_harvest() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.harvest_dry_g is not null and (tg_op = 'INSERT' or old.harvest_dry_g is null) then
    perform private.award_badge(new.owner_id, 'first_harvest');
    update profiles set first_grow = false where id = new.owner_id and first_grow;
  end if;
  return null;
end $$;
create trigger plants_harvest after insert or update of harvest_dry_g on public.public_plants
  for each row execute function private.on_plant_harvest();

-- ── Weekly updates: count, diary_keeper, notify followers ──
create or replace function private.on_plant_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.plant_id, old.plant_id); n int;
begin
  update public_plants set updated_weeks = (select count(*) from plant_updates where plant_id = pid)
    where id = pid returning updated_weeks into n;
  if tg_op = 'INSERT' then
    if n >= 6 then perform private.award_badge(new.owner_id, 'diary_keeper'); end if;
    insert into notifications (user_id, actor_id, type, meta)
      select f.follower_id, new.owner_id, 'update',
        jsonb_build_object('plant_id', new.plant_id, 'update_id', new.id, 'week_no', new.week_no)
      from follows f
      where f.following_id = new.owner_id
        and not exists (select 1 from blocks b where b.blocker_id = f.follower_id and b.blocked_id = new.owner_id);
  end if;
  return null;
end $$;
create trigger plant_updates_count after insert or delete on public.plant_updates
  for each row execute function private.on_plant_update();

-- ── Challenges ──
create or replace function private.on_entry_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.award_badge(new.user_id, 'challenger');
  return null;
end $$;
create trigger entries_badges after insert on public.challenge_entries for each row execute function private.on_entry_created();

-- votes: own window, not own entry, voter ≥ 3 days old with some activity
create or replace function public.check_challenge_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e challenge_entries;
  c challenges;
begin
  select * into e from challenge_entries where id = new.entry_id;
  select * into c from challenges where id = e.challenge_id;
  if e.challenge_id <> new.challenge_id then raise exception 'entry does not belong to challenge'; end if;
  if e.user_id = new.user_id then raise exception 'cannot vote for your own entry'; end if;
  if now() < c.starts_at or now() > c.voting_ends_at then raise exception 'voting is closed'; end if;
  if not exists (select 1 from profiles where id = new.user_id and created_at <= now() - interval '3 days') then
    raise exception 'vote_not_eligible: account must be at least 3 days old';
  end if;
  if not (exists (select 1 from posts where author_id = new.user_id)
      or exists (select 1 from comments where author_id = new.user_id)
      or exists (select 1 from public_plants where owner_id = new.user_id)) then
    raise exception 'vote_not_eligible: post, comment or share a plant first';
  end if;
  return new;
end $$;

-- M1: results are final once voting ends / entries are frozen once the entry window closes
create or replace function private.check_challenge_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.trusted() or private.is_admin() then return old; end if;
  if tg_table_name = 'challenge_votes' then
    if exists (select 1 from challenges where id = old.challenge_id and now() > voting_ends_at) then
      raise exception 'voting is closed';
    end if;
  elsif exists (select 1 from challenges where id = old.challenge_id and now() > ends_at) then
    raise exception 'entries are closed';
  end if;
  return old;
end $$;
create trigger challenge_votes_delete_check before delete on public.challenge_votes
  for each row execute function private.check_challenge_delete();
create trigger challenge_entries_delete_check before delete on public.challenge_entries
  for each row execute function private.check_challenge_delete();

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

-- ── L12: moderation notification when content gets hidden ──
create or replace function private.on_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
begin
  if new.is_hidden and not old.is_hidden then
    insert into notifications (user_id, type, post_id, comment_id, meta) values (owner, 'moderation',
      case tg_table_name when 'posts' then new.id when 'comments' then (to_jsonb(new) ->> 'post_id')::uuid end,
      case when tg_table_name = 'comments' then new.id end,
      jsonb_build_object('target_type', tg_table_name, 'target_id', new.id));
  end if;
  return null;
end $$;
create trigger posts_hidden after update of is_hidden on public.posts for each row execute function private.on_hidden('author_id');
create trigger comments_hidden after update of is_hidden on public.comments for each row execute function private.on_hidden('author_id');
create trigger tips_hidden after update of is_hidden on public.tips for each row execute function private.on_hidden('author_id');
create trigger plants_hidden after update of is_hidden on public.public_plants for each row execute function private.on_hidden('owner_id');
create trigger entries_hidden after update of is_hidden on public.challenge_entries for each row execute function private.on_hidden('user_id');

-- ── Discovery ──
create or replace function public.suggested_growers("limit" int default 10)
returns table (id uuid, username text, display_name text, avatar_url text, reputation int,
  environments text[], media text[], light_type text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, p.reputation, p.environments, p.media, p.light_type
  from profiles p
  left join profiles me on me.id = auth.uid()
  where not p.is_banned and p.accepted_terms_at is not null
    and p.id is distinct from auth.uid()
    and not exists (select 1 from follows f where f.follower_id = auth.uid() and f.following_id = p.id)
    and not exists (select 1 from blocks b where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
      or (b.blocker_id = p.id and b.blocked_id = auth.uid()))
  order by
    (case when me.id is null then 0 else
      cardinality(array(select unnest(p.environments) intersect select unnest(me.environments)))
      + cardinality(array(select unnest(p.media) intersect select unnest(me.media)))
      + (case when p.light_type = me.light_type then 1 else 0 end) end) desc,
    p.reputation desc, p.created_at desc
  limit least(greatest(coalesce("limit", 10), 1), 50)
$$;
revoke all on function public.suggested_growers(int) from public;
grant execute on function public.suggested_growers(int) to anon, authenticated;

-- ── Column protection / insert sanitizing for the new columns ──
create or replace function public.protect_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.trusted() or private.is_admin() then return new; end if;
  if tg_table_name = 'profiles' then
    new.is_admin := old.is_admin; new.is_banned := old.is_banned; new.reputation := old.reputation;
    new.created_at := old.created_at;
  elsif tg_table_name = 'posts' then
    new.is_hidden := old.is_hidden; new.likes_count := old.likes_count; new.comments_count := old.comments_count;
    new.author_id := old.author_id; new.created_at := old.created_at; new.reactions := old.reactions;
  elsif tg_table_name = 'comments' then
    new.is_hidden := old.is_hidden; new.likes_count := old.likes_count; new.is_ai := old.is_ai; new.author_id := old.author_id;
  elsif tg_table_name = 'tips' then
    new.is_hidden := old.is_hidden; new.helpful_count := old.helpful_count; new.unhelpful_count := old.unhelpful_count;
    new.score := old.score; new.author_id := old.author_id; new.created_at := old.created_at;
  elsif tg_table_name = 'public_plants' then
    new.is_hidden := old.is_hidden; new.owner_id := old.owner_id; new.updated_weeks := old.updated_weeks;
  elsif tg_table_name = 'strains' then
    new.approved := old.approved;
  elsif tg_table_name = 'challenge_entries' then
    new.votes_count := old.votes_count; new.is_hidden := old.is_hidden;
  elsif tg_table_name = 'plant_updates' then
    new.plant_id := old.plant_id; new.owner_id := old.owner_id; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger plant_updates_protect before update on public.plant_updates for each row execute function public.protect_columns();

create or replace function public.sanitize_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.trusted() or private.is_admin() then return new; end if;
  if tg_table_name = 'posts' then
    new.likes_count := 0; new.comments_count := 0; new.is_hidden := false; new.accepted_comment_id := null;
    new.edited_at := null; new.created_at := now(); new.reactions := '{}';
  elsif tg_table_name = 'comments' then
    new.likes_count := 0; new.is_hidden := false; new.created_at := now();
  elsif tg_table_name = 'tips' then
    new.helpful_count := 0; new.unhelpful_count := 0; new.score := 0; new.is_hidden := false; new.created_at := now();
  elsif tg_table_name = 'public_plants' then
    new.is_hidden := false; new.updated_weeks := 0;
  elsif tg_table_name = 'challenge_entries' then
    new.votes_count := 0; new.is_hidden := false; new.created_at := now();
  elsif tg_table_name = 'reports' then
    new.status := 'open'; new.resolved_by := null;
  elsif tg_table_name = 'plant_updates' then
    new.created_at := now();
  elsif tg_table_name = 'post_reactions' then
    new.created_at := now();
  end if;
  return new;
end $$;
create trigger plant_updates_sanitize before insert on public.plant_updates for each row execute function public.sanitize_insert();
create trigger post_reactions_sanitize before insert on public.post_reactions for each row execute function public.sanitize_insert();

-- ── Cross-object checks (+ plant_updates, pinned badges, L4 caption freeze) ──
create or replace function public.check_refs() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); img text;
begin
  if private.trusted() or private.is_admin() then return new; end if;
  if tg_table_name = 'posts' then
    if new.plant_id is not null and (tg_op = 'INSERT' or new.plant_id is distinct from old.plant_id)
      and not exists (select 1 from public_plants where id = new.plant_id and owner_id = uid) then
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
      if (new.image_url is distinct from old.image_url or new.plant_id is distinct from old.plant_id
          or new.caption is distinct from old.caption)
        and exists (select 1 from challenges where id = new.challenge_id and now() > ends_at) then
        raise exception 'entries are closed';
      end if;
      if new.image_url is distinct from old.image_url or new.plant_id is distinct from old.plant_id then
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
  elsif tg_table_name = 'plant_updates' then
    if not exists (select 1 from public_plants where id = new.plant_id and owner_id = uid) then
      raise exception 'plant does not belong to you';
    end if;
    foreach img in array new.images loop
      if not private.media_url_ok(img, uid) then raise exception 'images must be uploaded to your own media folder'; end if;
    end loop;
  elsif tg_table_name = 'profiles' then
    if new.avatar_url is not null and new.avatar_url is distinct from old.avatar_url and not private.media_url_ok(new.avatar_url, uid)
      and new.avatar_url not like 'https://lh3.googleusercontent.com/%' then
      raise exception 'avatar must be uploaded to your own media folder';
    end if;
    if new.pinned_badges is distinct from old.pinned_badges and exists (
      select unnest(new.pinned_badges) except select badge_id from user_badges where user_id = new.id) then
      raise exception 'you can only pin badges you have earned';
    end if;
  elsif tg_table_name = 'tip_votes' and tg_op = 'UPDATE' then
    new.tip_id := old.tip_id; new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger plant_updates_refs before insert or update on public.plant_updates for each row execute function public.check_refs();

-- ── M8: banned users cannot edit their profile ──
alter policy "own profile update" on public.profiles using ((id = auth.uid() and not is_banned) or private.is_admin());

-- ── L2: deleting an account takes back the reputation it gave ──
create or replace function private.on_profile_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  with gone as (delete from reputation_events where source_id = old.id returning user_id, points),
  per_user as (select user_id, sum(points) as pts from gone group by user_id)
  update profiles p set reputation = greatest(p.reputation - per_user.pts, 0)
    from per_user where p.id = per_user.user_id and p.id <> old.id;
  return old;
end $$;
create trigger profiles_delete_rep before delete on public.profiles for each row execute function private.on_profile_delete();

-- ── L3: owners may only mark notifications read ──
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ── M9: realtime notifications ──
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ── Veteran badge (scheduled daily) ──
create or replace function private.award_veterans() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with won as (
    insert into user_badges (user_id, badge_id)
    select id, 'veteran' from profiles where created_at <= now() - interval '1 year'
    on conflict do nothing returning user_id)
  insert into notifications (user_id, type, meta) select user_id, 'badge', '{"badge":"veteran"}'::jsonb from won;
  get diagnostics n = row_count;
  return n;
end $$;

-- ── Backfill badges for existing content (no notifications) ──
insert into public.user_badges (user_id, badge_id) select distinct author_id, 'first_post' from public.posts on conflict do nothing;
insert into public.user_badges (user_id, badge_id) select distinct user_id, 'first_answer' from public.reputation_events where kind = 'accepted' on conflict do nothing;
insert into public.user_badges (user_id, badge_id) select user_id, 'helper_10' from public.reputation_events where kind = 'accepted' group by user_id having count(*) >= 10 on conflict do nothing;
insert into public.user_badges (user_id, badge_id) select distinct author_id, 'tip_master' from public.tips where helpful_count >= 10 on conflict do nothing;
insert into public.user_badges (user_id, badge_id) select distinct owner_id, 'first_harvest' from public.public_plants where harvest_dry_g is not null on conflict do nothing;
insert into public.user_badges (user_id, badge_id) select distinct user_id, 'challenger' from public.challenge_entries on conflict do nothing;
insert into public.user_badges (user_id, badge_id) select id, 'veteran' from public.profiles where created_at <= now() - interval '1 year' on conflict do nothing;
update public.profiles set first_grow = false where id in (select owner_id from public.public_plants where harvest_dry_g is not null);

-- ── Keep internals out of the API ──
do $$
declare f text;
begin
  foreach f in array array[
    'private.trusted()', 'private.notify(uuid, uuid, text, uuid, uuid, jsonb)', 'public.notify(uuid, uuid, text, uuid, uuid)',
    'private.award_badge(uuid, text)', 'private.on_reaction()', 'public.on_post_like()', 'private.on_post_status()',
    'private.on_post_created()', 'public.on_accept()', 'public.on_comment()', 'public.on_tip_vote()',
    'private.on_plant_harvest()', 'private.on_plant_update()', 'private.on_entry_created()', 'public.check_challenge_vote()',
    'private.check_challenge_delete()', 'private.on_hidden()', 'public.protect_columns()', 'public.sanitize_insert()',
    'public.check_refs()', 'private.on_profile_delete()', 'private.award_veterans()'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;
