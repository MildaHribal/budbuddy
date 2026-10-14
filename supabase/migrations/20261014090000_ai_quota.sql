-- AI assistant needs sign-in: per-user daily quota taken by the chat edge function (service role).
-- The limit comes from the function (env AI_DAILY_LIMIT). Tokenless requests from older app builds
-- (only while AI_ALLOW_ANON=1) share one global daily counter under the nil uuid.

create table if not exists private.ai_usage (
  user_id uuid not null,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
revoke all on private.ai_usage from public, anon, authenticated;

create or replace function private.ai_take(key uuid, lim int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare taken int;
begin
  if key is null or lim is null or lim < 1 then return false; end if;
  insert into private.ai_usage as u (user_id, day, n) values (key, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set n = u.n + 1 where u.n < lim
  returning n into taken;
  return taken is not null;
end $$;

-- 'ok' | 'limit' | 'banned' (also for a missing profile)
create or replace function public.ai_quota_take(uid uuid, lim int) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if uid is null or uid = '00000000-0000-0000-0000-000000000000'
    or not exists (select 1 from public.profiles where id = uid and not is_banned) then
    return 'banned';
  end if;
  return case when private.ai_take(uid, lim) then 'ok' else 'limit' end;
end $$;

create or replace function public.ai_anon_quota_take(lim int) returns boolean
language sql security definer set search_path = '' as $$
  select private.ai_take('00000000-0000-0000-0000-000000000000', lim)
$$;

revoke all on function private.ai_take(uuid, int) from public, anon, authenticated;
revoke all on function public.ai_quota_take(uuid, int) from public, anon, authenticated;
revoke all on function public.ai_anon_quota_take(int) from public, anon, authenticated;
grant execute on function public.ai_quota_take(uuid, int) to service_role;
grant execute on function public.ai_anon_quota_take(int) to service_role;

-- old counters go with the daily job
create or replace function private.daily_maintenance() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from private.rate_log where at < now() - interval '1 hour';
  delete from private.ai_usage where day < (now() at time zone 'utc')::date - 7;
  perform private.award_veterans();
end $$;
revoke execute on function private.daily_maintenance() from public, anon, authenticated;
