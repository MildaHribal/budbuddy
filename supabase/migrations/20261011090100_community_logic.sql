-- Triggers, rate limits, moderation, RLS and storage for the community.

-- ── Counters & notifications ────────────────────────────────────────

create or replace function public.notify(target uuid, actor uuid, kind text, p uuid, c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target is null or target = actor then return; end if;
  if exists (select 1 from blocks where blocker_id = target and blocked_id = actor) then return; end if;
  insert into notifications (user_id, actor_id, type, post_id, comment_id) values (target, actor, kind, p, c);
end $$;

create or replace function public.on_post_like() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
    update profiles set reputation = reputation + 1 where id = (select author_id from posts where id = new.post_id);
    perform notify((select author_id from posts where id = new.post_id), new.user_id, 'like', new.post_id, null);
  else
    update posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    update profiles set reputation = greatest(reputation - 1, 0) where id = (select author_id from posts where id = old.post_id);
  end if;
  return null;
end $$;
create trigger post_likes_count after insert or delete on public.post_likes for each row execute function public.on_post_like();

create or replace function public.on_comment_like() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update comments set likes_count = likes_count + 1 where id = new.comment_id;
  else
    update comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end $$;
create trigger comment_likes_count after insert or delete on public.comment_likes for each row execute function public.on_comment_like();

create or replace function public.on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p posts;
begin
  if tg_op = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = new.post_id returning * into p;
    if new.parent_id is not null then
      perform notify((select author_id from comments where id = new.parent_id), new.author_id, 'reply', new.post_id, new.id);
    end if;
    perform notify(p.author_id, new.author_id, 'comment', new.post_id, new.id);
  else
    update posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments for each row execute function public.on_comment();

create or replace function public.on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify(new.following_id, new.follower_id, 'follow', null, null);
  return null;
end $$;
create trigger follows_notify after insert on public.follows for each row execute function public.on_follow();

-- accepted answer: +5 reputation and a notification
create or replace function public.on_accept() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  answer_author uuid;
begin
  if new.accepted_comment_id is distinct from old.accepted_comment_id and new.accepted_comment_id is not null then
    select author_id into answer_author from comments where id = new.accepted_comment_id;
    update profiles set reputation = reputation + 5 where id = answer_author and id <> new.author_id;
    perform notify(answer_author, new.author_id, 'accepted', new.id, new.accepted_comment_id);
  end if;
  return new;
end $$;
create trigger posts_accept after update of accepted_comment_id on public.posts for each row execute function public.on_accept();

-- tips are ranked by the Wilson lower bound so 1 vote never beats 50
create or replace function public.wilson(up int, down int) returns double precision
language sql immutable as $$
  select case when up + down = 0 then 0 else
    ((up + 1.9208) / (up + down) - 1.96 * sqrt((up * down) / (up + down)::double precision + 0.9604) / (up + down))
    / (1 + 3.8416 / (up + down)) end
$$;

create or replace function public.on_tip_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  t uuid := coalesce(new.tip_id, old.tip_id);
begin
  update tips set
    helpful_count = (select count(*) from tip_votes where tip_id = t and value = 1),
    unhelpful_count = (select count(*) from tip_votes where tip_id = t and value = -1)
  where id = t;
  update tips set score = wilson(helpful_count, unhelpful_count) where id = t;
  if tg_op = 'INSERT' and new.value = 1 then
    update profiles set reputation = reputation + 2 where id = (select author_id from tips where id = t);
  end if;
  return null;
end $$;
create trigger tip_votes_score after insert or update or delete on public.tip_votes for each row execute function public.on_tip_vote();

create or replace function public.on_challenge_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update challenge_entries set votes_count = votes_count + 1 where id = new.entry_id;
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    update challenge_entries set votes_count = greatest(votes_count - 1, 0) where id = old.entry_id;
  end if;
  return null;
end $$;
create trigger challenge_votes_count after insert or update or delete on public.challenge_votes for each row execute function public.on_challenge_vote();

-- votes only while voting is open, never for your own entry
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
  return new;
end $$;
create trigger challenge_votes_check before insert or update on public.challenge_votes for each row execute function public.check_challenge_vote();

create or replace function public.check_challenge_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c challenges;
begin
  select * into c from challenges where id = new.challenge_id;
  if now() < c.starts_at or now() > c.ends_at then raise exception 'challenge is not open for entries'; end if;
  return new;
end $$;
create trigger challenge_entries_check before insert on public.challenge_entries for each row execute function public.check_challenge_entry();

-- ── Rate limits ─────────────────────────────────────────────────────

create or replace function public.rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
  lim int := tg_argv[1]::int;
begin
  execute format('select count(*) from %I where %I = $1 and created_at > now() - interval ''1 hour''', tg_table_name, tg_argv[0])
    into n using (to_jsonb(new) ->> tg_argv[0])::uuid;
  if n >= lim then raise exception 'rate limit: slow down a little' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger posts_rate before insert on public.posts for each row execute function public.rate_limit('author_id', '10');
create trigger comments_rate before insert on public.comments for each row when (not new.is_ai) execute function public.rate_limit('author_id', '60');
create trigger tips_rate before insert on public.tips for each row execute function public.rate_limit('author_id', '10');
create trigger reports_rate before insert on public.reports for each row execute function public.rate_limit('reporter_id', '20');

-- ── Moderation: 3 distinct reports hide the target until reviewed ───

create or replace function public.on_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  select count(distinct reporter_id) into n from reports
    where target_type = new.target_type and target_id = new.target_id and status = 'open';
  if n >= 3 then
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
create trigger reports_autohide after insert on public.reports for each row execute function public.on_report();

-- users may not flip moderation / counter columns themselves
create or replace function public.protect_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_table_name = 'profiles' then
    new.is_admin := old.is_admin; new.is_banned := old.is_banned; new.reputation := old.reputation;
  elsif tg_table_name = 'posts' then
    new.is_hidden := old.is_hidden; new.likes_count := old.likes_count; new.comments_count := old.comments_count;
    new.author_id := old.author_id; new.created_at := old.created_at;
  elsif tg_table_name = 'comments' then
    new.is_hidden := old.is_hidden; new.likes_count := old.likes_count; new.is_ai := old.is_ai; new.author_id := old.author_id;
  elsif tg_table_name = 'tips' then
    new.is_hidden := old.is_hidden; new.helpful_count := old.helpful_count; new.unhelpful_count := old.unhelpful_count; new.score := old.score;
  elsif tg_table_name = 'public_plants' then
    new.is_hidden := old.is_hidden; new.owner_id := old.owner_id;
  elsif tg_table_name = 'strains' then
    new.approved := old.approved;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_columns();
create trigger posts_protect before update on public.posts for each row execute function public.protect_columns();
create trigger comments_protect before update on public.comments for each row execute function public.protect_columns();
create trigger tips_protect before update on public.tips for each row execute function public.protect_columns();
create trigger plants_protect before update on public.public_plants for each row execute function public.protect_columns();
create trigger strains_protect before update on public.strains for each row execute function public.protect_columns();

-- ── Account deletion (GDPR / Google Play) ──────────────────────────

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from storage.objects where bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ── Row level security ──────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.strains enable row level security;
alter table public.public_plants enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.comment_likes enable row level security;
alter table public.saves enable row level security;
alter table public.follows enable row level security;
alter table public.tips enable row level security;
alter table public.tip_votes enable row level security;
alter table public.strain_reports enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.challenge_votes enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile update" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- strains: approved ones public; anyone signed in may suggest
create policy "strains readable" on public.strains for select using (approved or created_by = auth.uid() or public.is_admin());
create policy "suggest strain" on public.strains for insert with check (public.can_post() and created_by = auth.uid() and (approved = false or public.is_admin()));
create policy "admin strains" on public.strains for update using (public.is_admin());
create policy "admin strains delete" on public.strains for delete using (public.is_admin());

-- public plants
create policy "plants readable" on public.public_plants for select using (not is_hidden or owner_id = auth.uid() or public.is_admin());
create policy "own plants insert" on public.public_plants for insert with check (owner_id = auth.uid() and public.can_post());
create policy "own plants update" on public.public_plants for update using (owner_id = auth.uid() or public.is_admin());
create policy "own plants delete" on public.public_plants for delete using (owner_id = auth.uid() or public.is_admin());

-- posts
create policy "posts readable" on public.posts for select using (not is_hidden or author_id = auth.uid() or public.is_admin());
create policy "own posts insert" on public.posts for insert with check (author_id = auth.uid() and public.can_post());
create policy "own posts update" on public.posts for update using (author_id = auth.uid() or public.is_admin());
create policy "own posts delete" on public.posts for delete using (author_id = auth.uid() or public.is_admin());

-- comments (AI answers are inserted by the server with the service role)
create policy "comments readable" on public.comments for select using (not is_hidden or author_id = auth.uid() or public.is_admin());
create policy "own comments insert" on public.comments for insert with check (author_id = auth.uid() and not is_ai and public.can_post());
create policy "own comments update" on public.comments for update using (author_id = auth.uid() or public.is_admin());
create policy "own comments delete" on public.comments for delete using (author_id = auth.uid() or public.is_admin());

-- likes, saves, follows, votes, blocks: own rows
create policy "likes readable" on public.post_likes for select using (true);
create policy "own likes" on public.post_likes for insert with check (user_id = auth.uid() and public.can_post());
create policy "own likes delete" on public.post_likes for delete using (user_id = auth.uid());
create policy "comment likes readable" on public.comment_likes for select using (true);
create policy "own comment likes" on public.comment_likes for insert with check (user_id = auth.uid() and public.can_post());
create policy "own comment likes delete" on public.comment_likes for delete using (user_id = auth.uid());
create policy "own saves" on public.saves for select using (user_id = auth.uid());
create policy "own saves insert" on public.saves for insert with check (user_id = auth.uid());
create policy "own saves delete" on public.saves for delete using (user_id = auth.uid());
create policy "follows readable" on public.follows for select using (true);
create policy "own follows" on public.follows for insert with check (follower_id = auth.uid() and public.can_post());
create policy "own follows delete" on public.follows for delete using (follower_id = auth.uid());
create policy "tip votes own" on public.tip_votes for select using (user_id = auth.uid());
create policy "tip votes insert" on public.tip_votes for insert with check (user_id = auth.uid() and public.can_post() and (select author_id from public.tips where id = tip_id) <> auth.uid());
create policy "tip votes update" on public.tip_votes for update using (user_id = auth.uid());
create policy "tip votes delete" on public.tip_votes for delete using (user_id = auth.uid());
create policy "own blocks" on public.blocks for select using (blocker_id = auth.uid());
create policy "own blocks insert" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "own blocks delete" on public.blocks for delete using (blocker_id = auth.uid());

-- tips
create policy "tips readable" on public.tips for select using (not is_hidden or author_id = auth.uid() or public.is_admin());
create policy "own tips insert" on public.tips for insert with check (author_id = auth.uid() and public.can_post());
create policy "own tips update" on public.tips for update using (author_id = auth.uid() or public.is_admin());
create policy "own tips delete" on public.tips for delete using (author_id = auth.uid() or public.is_admin());

-- strain reports
create policy "strain reports readable" on public.strain_reports for select using (true);
create policy "own strain reports" on public.strain_reports for insert with check (user_id = auth.uid() and public.can_post());
create policy "own strain reports update" on public.strain_reports for update using (user_id = auth.uid());
create policy "own strain reports delete" on public.strain_reports for delete using (user_id = auth.uid() or public.is_admin());

-- challenges (admin-run)
create policy "challenges readable" on public.challenges for select using (true);
create policy "admin challenges" on public.challenges for all using (public.is_admin()) with check (public.is_admin());
create policy "entries readable" on public.challenge_entries for select using (not is_hidden or user_id = auth.uid() or public.is_admin());
create policy "own entries" on public.challenge_entries for insert with check (user_id = auth.uid() and public.can_post());
create policy "own entries update" on public.challenge_entries for update using (user_id = auth.uid() or public.is_admin());
create policy "own entries delete" on public.challenge_entries for delete using (user_id = auth.uid() or public.is_admin());
create policy "challenge votes readable" on public.challenge_votes for select using (user_id = auth.uid() or public.is_admin());
create policy "own challenge votes" on public.challenge_votes for insert with check (user_id = auth.uid() and public.can_post());
create policy "own challenge votes update" on public.challenge_votes for update using (user_id = auth.uid());
create policy "own challenge votes delete" on public.challenge_votes for delete using (user_id = auth.uid());

-- reports: write own, admins read and resolve
create policy "own reports" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports admin read" on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports admin update" on public.reports for update using (public.is_admin());

-- notifications
create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update using (user_id = auth.uid());
create policy "own notifications delete" on public.notifications for delete using (user_id = auth.uid());

-- ── Storage: one public bucket, users write only into their own folder ──

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text and public.can_post());
create policy "media update own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
