-- Blocking works both ways: the blocked user no longer sees the blocker's content and can't
-- comment on, react to or follow them; follows between the two are dropped and neither side
-- gets notifications from the other.

-- true when `author` has blocked the signed-in user
create or replace function private.blocked_me(author uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and author is not null and exists (
    select 1 from public.blocks where blocker_id = author and blocked_id = auth.uid())
$$;

-- same for the author of a post / comment (looked up without RLS, a hidden post must still count)
create or replace function private.blocked_me_post(post uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.posts p join public.blocks b on b.blocker_id = p.author_id
    where p.id = post and b.blocked_id = auth.uid())
$$;
create or replace function private.blocked_me_comment(comment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and comment is not null and exists (
    select 1 from public.comments c join public.blocks b on b.blocker_id = c.author_id
    where c.id = comment and b.blocked_id = auth.uid())
$$;
revoke all on function private.blocked_me(uuid), private.blocked_me_post(uuid), private.blocked_me_comment(uuid) from public;
grant execute on function private.blocked_me(uuid), private.blocked_me_post(uuid), private.blocked_me_comment(uuid) to anon, authenticated;

-- ── Reads ──
alter policy "posts readable" on public.posts using (
  ((not is_hidden or author_id = auth.uid()) and not private.blocked_me(author_id)) or private.is_admin());
alter policy "comments readable" on public.comments using (
  ((((not is_hidden) and exists (select 1 from public.posts p where p.id = post_id and not p.is_hidden)) or author_id = auth.uid())
    and not private.blocked_me(author_id)) or private.is_admin());
alter policy "tips readable" on public.tips using (
  ((not is_hidden or author_id = auth.uid()) and not private.blocked_me(author_id)) or private.is_admin());
alter policy "plants readable" on public.public_plants using (
  ((not is_hidden or owner_id = auth.uid()) and not private.blocked_me(owner_id)) or private.is_admin());
alter policy "entries readable" on public.challenge_entries using (
  ((not is_hidden or user_id = auth.uid()) and not private.blocked_me(user_id)) or private.is_admin());
alter policy "strain reports readable" on public.strain_reports using (not private.blocked_me(user_id) or private.is_admin());

-- ── Writes towards the blocker ──
alter policy "own comments insert" on public.comments with check (
  author_id = auth.uid() and not is_ai and private.can_post()
  and not private.blocked_me_post(post_id) and not private.blocked_me_comment(parent_id));
alter policy "own reactions insert" on public.post_reactions with check (
  user_id = auth.uid() and private.can_post() and not private.blocked_me_post(post_id));
alter policy "own likes" on public.post_likes with check (
  user_id = auth.uid() and private.can_post() and not private.blocked_me_post(post_id));
alter policy "own follows" on public.follows with check (
  follower_id = auth.uid() and private.can_post() and not private.blocked_me(following_id));

-- ── No self-blocks; a block ends follows both ways ──
delete from public.blocks where blocker_id = blocked_id;
alter table public.blocks add constraint blocks_not_self check (blocker_id <> blocked_id);

create or replace function private.on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from follows where (follower_id = new.blocker_id and following_id = new.blocked_id)
    or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end $$;
create trigger blocks_unfollow after insert on public.blocks for each row execute function private.on_block();

delete from public.follows f using public.blocks b
  where (b.blocker_id = f.follower_id and b.blocked_id = f.following_id)
     or (b.blocker_id = f.following_id and b.blocked_id = f.follower_id);

-- ── Notifications: skip in both directions ──
create or replace function private.notify(target uuid, actor uuid, kind text, p uuid, c uuid, m jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target is null or target = actor then return; end if;
  if actor is not null and exists (select 1 from blocks
      where (blocker_id = target and blocked_id = actor) or (blocker_id = actor and blocked_id = target)) then
    return;
  end if;
  if kind in ('like', 'reaction', 'follow', 'accepted', 'tip_vote') and exists (
    select 1 from notifications where user_id = target and actor_id is not distinct from actor and type = kind
      and post_id is not distinct from p and (kind <> 'tip_vote' or meta is not distinct from m)
      and created_at > now() - interval '1 day') then return; end if;
  insert into notifications (user_id, actor_id, type, post_id, comment_id, meta) values (target, actor, kind, p, c, m);
end $$;

revoke execute on function private.on_block() from public, anon, authenticated;
revoke execute on function private.notify(uuid, uuid, text, uuid, uuid, jsonb) from public, anon, authenticated;
