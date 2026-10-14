-- Shadow Grow weekly challenge: one challenge per ISO week, one run per user and week.
-- Rows are written only by the game-submit edge function (service role): it replays the logged
-- actions with the shared sim and stores the server-computed score.
-- Challenges are created lazily by that function for the current ISO week (seed derived from the
-- week id), so no cron job is needed.
-- Resubmitting is allowed; the stored run is replaced only when the new score is higher (best-of).

create table public.game_challenges (
  id text primary key check (id ~ '^\d{4}-W\d{2}$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  def jsonb not null check (jsonb_typeof(def) = 'object' and pg_column_size(def) <= 4096),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.game_challenges enable row level security;
create policy "game challenges readable" on public.game_challenges for select using (true);
revoke insert, update, delete on public.game_challenges from anon, authenticated;
grant select on public.game_challenges to anon, authenticated;

create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.game_challenges on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  actions jsonb not null check (jsonb_typeof(actions) = 'array' and jsonb_array_length(actions) <= 5000
    and pg_column_size(actions) <= 204800),
  client_score jsonb check (client_score is null or pg_column_size(client_score) <= 512),
  score numeric not null check (score >= 0),
  quality numeric not null check (quality between 0 and 100),
  dry_g numeric not null check (dry_g >= 0),
  verified boolean not null default false,
  submissions int not null default 1,
  -- when the stored (best) score was reached; breaks ties on the board
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
create index game_runs_board_idx on public.game_runs (challenge_id, score desc, submitted_at) where verified;
alter table public.game_runs enable row level security;
create policy "own game runs readable" on public.game_runs for select using (user_id = auth.uid());
revoke insert, update, delete on public.game_runs from anon, authenticated;
revoke select on public.game_runs from anon;

-- ── Leaderboard: verified runs, banned users left out, blocks hidden both ways, no actions ──
create or replace function private.game_board() returns table (
  challenge_id text, rank bigint, user_id uuid, username citext, display_name text, avatar_url text,
  score numeric, quality numeric, dry_g numeric, submitted_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select b.challenge_id, b.rank, b.user_id, b.username, b.display_name, b.avatar_url,
    b.score, b.quality, b.dry_g, b.submitted_at
  from (
    select r.challenge_id, r.user_id, p.username, p.display_name, p.avatar_url, r.score, r.quality, r.dry_g, r.submitted_at,
      row_number() over (partition by r.challenge_id order by r.score desc, r.submitted_at) as rank
    from public.game_runs r join public.profiles p on p.id = r.user_id
    where r.verified and not p.is_banned
  ) b
  where not exists (
    select 1 from public.blocks k
    where (k.blocker_id = b.user_id and k.blocked_id = auth.uid())
       or (k.blocker_id = auth.uid() and k.blocked_id = b.user_id))
$$;
revoke all on function private.game_board() from public, anon;
grant execute on function private.game_board() to authenticated;

create view public.game_leaderboard with (security_invoker = true) as
  select * from private.game_board();
revoke all on public.game_leaderboard from anon;
grant select on public.game_leaderboard to authenticated;

-- ── Edge function writes (service role only) ──

-- returns the row for the week, inserting it when missing
create or replace function public.game_ensure_challenge(cid text, starts timestamptz, ends timestamptz, d jsonb)
returns public.game_challenges
language plpgsql security definer set search_path = '' as $$
declare ch public.game_challenges;
begin
  insert into public.game_challenges (id, starts_at, ends_at, def) values (cid, starts, ends, d)
  on conflict (id) do nothing;
  select * into ch from public.game_challenges where id = cid;
  return ch;
end $$;

-- {status: 'ok' | 'banned' | 'closed' | 'rate', improved, best, rank}
create or replace function public.game_submit_run(uid uuid, cid text, acts jsonb, client jsonb, s numeric, q numeric, g numeric)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n int;
  saved uuid;
  mine public.game_runs;
  pos bigint;
begin
  if uid is null or not exists (
      select 1 from public.profiles where id = uid and not is_banned and accepted_terms_at is not null) then
    return jsonb_build_object('status', 'banned');
  end if;
  if not exists (select 1 from public.game_challenges where id = cid and now() between starts_at and ends_at) then
    return jsonb_build_object('status', 'closed');
  end if;

  delete from private.rate_log where user_id = uid and tbl = 'game_runs' and at < now() - interval '1 hour';
  select count(*) into n from private.rate_log where user_id = uid and tbl = 'game_runs';
  if n >= 10 then return jsonb_build_object('status', 'rate'); end if;
  insert into private.rate_log (user_id, tbl) values (uid, 'game_runs');

  insert into public.game_runs as r (challenge_id, user_id, actions, client_score, score, quality, dry_g, verified)
  values (cid, uid, acts, client, s, q, g, true)
  on conflict (challenge_id, user_id) do update
    set actions = excluded.actions, client_score = excluded.client_score, score = excluded.score,
      quality = excluded.quality, dry_g = excluded.dry_g, verified = true, submitted_at = now(),
      submissions = r.submissions + 1
    where excluded.score > r.score
  returning r.id into saved;
  if saved is null then
    update public.game_runs set submissions = submissions + 1 where challenge_id = cid and user_id = uid;
  end if;

  select * into mine from public.game_runs where challenge_id = cid and user_id = uid;
  select 1 + count(*) into pos
  from public.game_runs r join public.profiles p on p.id = r.user_id
  where r.challenge_id = cid and r.verified and not p.is_banned and r.user_id <> uid
    and (r.score > mine.score or (r.score = mine.score and r.submitted_at < mine.submitted_at));

  return jsonb_build_object('status', 'ok', 'improved', saved is not null, 'best', mine.score,
    'quality', mine.quality, 'dryG', mine.dry_g, 'rank', pos);
end $$;

revoke all on function public.game_ensure_challenge(text, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.game_submit_run(uuid, text, jsonb, jsonb, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.game_ensure_challenge(text, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.game_submit_run(uuid, text, jsonb, jsonb, numeric, numeric, numeric) to service_role;
grant select, insert, update, delete on public.game_challenges, public.game_runs to service_role;
