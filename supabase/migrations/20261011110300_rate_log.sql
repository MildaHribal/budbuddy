-- Rate limits count an append-only log, so create→delete loops no longer escape them.
create table private.rate_log (
  user_id uuid not null,
  tbl text not null,
  at timestamptz not null default now()
);
create index rate_log_idx on private.rate_log (user_id, tbl, at);

create or replace function public.rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  lim int := tg_argv[1]::int;
  n int;
begin
  if uid is null or pg_trigger_depth() > 1 then return new; end if;
  delete from private.rate_log where user_id = uid and tbl = tg_table_name and at < now() - interval '1 hour';
  select count(*) into n from private.rate_log where user_id = uid and tbl = tg_table_name;
  if n >= lim then raise exception 'rate limit: slow down a little' using errcode = 'P0001'; end if;
  insert into private.rate_log (user_id, tbl) values (uid, tg_table_name);
  return new;
end $$;
revoke execute on function public.rate_limit() from public, anon, authenticated;

create trigger reactions_rate before insert on public.post_reactions for each row execute function public.rate_limit('user_id', '200');
create trigger plant_updates_rate before insert on public.plant_updates for each row execute function public.rate_limit('owner_id', '20');
create trigger comment_likes_rate before insert on public.comment_likes for each row execute function public.rate_limit('user_id', '300');
create trigger saves_rate before insert on public.saves for each row execute function public.rate_limit('user_id', '200');
create trigger tip_votes_rate before insert on public.tip_votes for each row execute function public.rate_limit('user_id', '200');
create trigger challenge_votes_rate before insert on public.challenge_votes for each row execute function public.rate_limit('user_id', '60');
create trigger blocks_rate before insert on public.blocks for each row execute function public.rate_limit('blocker_id', '60');
create trigger plants_rate before insert on public.public_plants for each row execute function public.rate_limit('owner_id', '240');

create or replace function private.daily_maintenance() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from private.rate_log where at < now() - interval '1 hour';
  perform private.award_veterans();
end $$;
revoke execute on function private.daily_maintenance() from public, anon, authenticated;
