-- Unlimited AI bought outside any store: the grower pays the owner and sends the e-mail of the account,
-- an admin switches it on here. Daily AI quota now counts text and photo requests separately per tier.
-- App config (how to pay, contact, donate link) is editable from the admin page.

create table if not exists private.entitlements (
  user_id uuid primary key references auth.users on delete cascade,
  ai_unlimited boolean not null default false,
  note text check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
revoke all on private.entitlements from public, anon, authenticated;

alter table private.ai_usage add column if not exists photos int not null default 0;

create or replace function private.ai_tier(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.profiles where id = uid and is_admin) then 'admin'
    when exists (select 1 from private.entitlements where user_id = uid and ai_unlimited) then 'unlimited'
    else 'free' end
$$;

-- lims: {"free": {"text": 5, "photo": 3}, "unlimited": {...}, "admin": {...}}
-- returns {status: ok|limit|banned, tier, limit, used}
create or replace function public.ai_quota_take2(uid uuid, kind text, lims jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  tier text;
  lim int;
  photo boolean := kind = 'photo';
  taken int;
  today date := (now() at time zone 'utc')::date;
begin
  if uid is null or uid = '00000000-0000-0000-0000-000000000000'
    or not exists (select 1 from public.profiles where id = uid and not is_banned) then
    return jsonb_build_object('status', 'banned');
  end if;
  tier := private.ai_tier(uid);
  lim := coalesce((lims -> tier ->> (case when photo then 'photo' else 'text' end))::int, 0);
  if lim < 1 then return jsonb_build_object('status', 'limit', 'tier', tier, 'limit', 0); end if;
  if photo then
    insert into private.ai_usage as u (user_id, day, n, photos) values (uid, today, 0, 1)
    on conflict (user_id, day) do update set photos = u.photos + 1 where u.photos < lim
    returning photos into taken;
  else
    insert into private.ai_usage as u (user_id, day, n) values (uid, today, 1)
    on conflict (user_id, day) do update set n = u.n + 1 where u.n < lim
    returning n into taken;
  end if;
  return jsonb_build_object('status', case when taken is null then 'limit' else 'ok' end, 'tier', tier, 'limit', lim);
end $$;

revoke all on function private.ai_tier(uuid) from public, anon, authenticated;
revoke all on function public.ai_quota_take2(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.ai_quota_take2(uuid, text, jsonb) to service_role;

-- the grower's own state for the app: tier and today's usage
create or replace function public.my_ai_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tier', private.ai_tier(auth.uid()),
    'text', coalesce((select n from private.ai_usage where user_id = auth.uid() and day = (now() at time zone 'utc')::date), 0),
    'photo', coalesce((select photos from private.ai_usage where user_id = auth.uid() and day = (now() at time zone 'utc')::date), 0))
  where auth.uid() is not null
$$;
revoke all on function public.my_ai_status() from public, anon;
grant execute on function public.my_ai_status() to authenticated;

-- admin: find accounts by e-mail or username, with their AI tier
create or replace function public.admin_find_users(q text) returns table (
  id uuid, email text, username text, display_name text, created_at timestamptz,
  last_sign_in_at timestamptz, is_admin boolean, is_banned boolean, ai_unlimited boolean, note text)
language plpgsql stable security definer set search_path = '' as $$
declare s text := lower(btrim(coalesce(q, '')));
begin
  if not private.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if char_length(s) < 2 then return; end if;
  return query
    select u.id, u.email::text, p.username, p.display_name, u.created_at, u.last_sign_in_at,
      coalesce(p.is_admin, false), coalesce(p.is_banned, false), coalesce(e.ai_unlimited, false), e.note
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join private.entitlements e on e.user_id = u.id
    where lower(u.email) like '%' || s || '%' or p.username like '%' || ltrim(s, '@') || '%'
    order by (lower(u.email) = s) desc, u.created_at desc
    limit 20;
end $$;
revoke all on function public.admin_find_users(text) from public, anon;
grant execute on function public.admin_find_users(text) to authenticated;

create or replace function public.admin_set_ai_unlimited(uid uuid, enabled boolean, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  insert into private.entitlements as e (user_id, ai_unlimited, note, updated_at, updated_by)
  values (uid, enabled, nullif(left(btrim(note), 500), ''), now(), auth.uid())
  on conflict (user_id) do update set ai_unlimited = excluded.ai_unlimited,
    note = coalesce(excluded.note, e.note), updated_at = now(), updated_by = auth.uid();
end $$;
revoke all on function public.admin_set_ai_unlimited(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_ai_unlimited(uuid, boolean, text) to authenticated;

-- admin: numbers for the analytics tab
create or replace function public.admin_analytics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
  r jsonb;
begin
  if not private.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'users7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users30', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active7', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active30', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'aiUsers7', (select count(distinct user_id) from private.ai_usage where day > today - 7
      and user_id <> '00000000-0000-0000-0000-000000000000'),
    'unlimited', (select count(*) from private.entitlements where ai_unlimited),
    'banned', (select count(*) from public.profiles where is_banned),
    'posts', (select count(*) from public.posts),
    'posts7', (select count(*) from public.posts where created_at > now() - interval '7 days'),
    'comments7', (select count(*) from public.comments where created_at > now() - interval '7 days'),
    'deletionOpen', (select count(*) from private.deletion_requests where status = 'open'),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d), '[]')
      from (select g::date d, (select count(*) from auth.users where (created_at at time zone 'utc')::date = g::date) n
        from generate_series(today - 29, today, interval '1 day') g) s),
    'ai', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'text', t, 'photo', p) order by d), '[]')
      from (select g::date d, coalesce(sum(a.n), 0) t, coalesce(sum(a.photos), 0) p
        from generate_series(today - 29, today, interval '1 day') g
        left join private.ai_usage a on a.day = g::date group by g) s)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_analytics() from public, anon;
grant execute on function public.admin_analytics() to authenticated;

-- AI usage history feeds the analytics, keep 90 days
create or replace function private.daily_maintenance() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from private.rate_log where at < now() - interval '1 hour';
  delete from private.ai_usage where day < (now() at time zone 'utc')::date - 90;
  perform private.award_veterans();
end $$;
revoke execute on function private.daily_maintenance() from public, anon, authenticated;

-- one row: payment instructions, contact and donate link shown in the app
create table if not exists public.app_config (
  id int primary key default 1 check (id = 1),
  price text not null default '5 USD' check (char_length(price) <= 40),
  pay_note text not null default '' check (char_length(pay_note) <= 2000),
  pay_url text not null default '' check (char_length(pay_url) <= 500),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  contact_url text not null default '' check (char_length(contact_url) <= 500),
  donate_url text not null default '' check (char_length(donate_url) <= 500),
  donate_note text not null default '' check (char_length(donate_note) <= 2000),
  updated_at timestamptz not null default now()
);
insert into public.app_config (id) values (1) on conflict do nothing;
alter table public.app_config enable row level security;
revoke all on public.app_config from public, anon, authenticated;
grant select on public.app_config to anon, authenticated;
grant update (price, pay_note, pay_url, contact_email, contact_url, donate_url, donate_note, updated_at) on public.app_config to authenticated;
drop policy if exists "app config read" on public.app_config;
create policy "app config read" on public.app_config for select using (true);
drop policy if exists "app config admin" on public.app_config;
create policy "app config admin" on public.app_config for update using (private.is_admin()) with check (private.is_admin());
