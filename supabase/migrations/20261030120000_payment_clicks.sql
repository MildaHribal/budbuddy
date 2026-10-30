-- A tap on the payment or donate link in the app notifies every admin, so a payment can be matched fast.

create table if not exists private.payment_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  kind text not null check (kind in ('pay', 'donate')),
  at timestamptz not null default now()
);
create index if not exists payment_clicks_at on private.payment_clicks (at desc);
revoke all on private.payment_clicks from public, anon, authenticated;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('like', 'reaction', 'comment',
  'reply', 'follow', 'accepted', 'tip_vote', 'challenge', 'moderation', 'badge', 'solve_ping', 'update', 'payment'));

-- 'ok' | 'skipped' (repeat within 10 minutes or the global brake)
create or replace function public.log_payment_click(kind text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text;
  k text := case when kind = 'donate' then 'donate' else 'pay' end;
begin
  if (select count(*) from private.payment_clicks where at > now() - interval '1 hour') >= 100 then return 'skipped'; end if;
  if exists (select 1 from private.payment_clicks c where c.user_id is not distinct from uid and c.kind = k
      and c.at > now() - interval '10 minutes') then
    return 'skipped';
  end if;
  insert into private.payment_clicks (user_id, kind) values (uid, k);
  select email into mail from auth.users where id = uid;
  insert into public.notifications (user_id, actor_id, type, meta)
  select p.id, (select id from public.profiles where id = uid), 'payment',
    jsonb_build_object('kind', k, 'email', coalesce(mail, ''), 'uid', coalesce(uid::text, ''))
  from public.profiles p where p.is_admin;
  return 'ok';
end $$;
revoke all on function public.log_payment_click(text) from public;
grant execute on function public.log_payment_click(text) to anon, authenticated;

-- admin: recent taps on the payment link by accounts without unlimited AI yet
create or replace function public.admin_payment_clicks() returns table (
  user_id uuid, email text, username text, clicks bigint, last_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return query
    select c.user_id, u.email::text, p.username::text, count(*), max(c.at)
    from private.payment_clicks c
    join auth.users u on u.id = c.user_id
    left join public.profiles p on p.id = c.user_id
    left join private.entitlements e on e.user_id = c.user_id
    where c.kind = 'pay' and c.at > now() - interval '30 days' and not coalesce(e.ai_unlimited, false)
    group by c.user_id, u.email, p.username
    order by max(c.at) desc
    limit 50;
end $$;
revoke all on function public.admin_payment_clicks() from public, anon;
grant execute on function public.admin_payment_clicks() to authenticated;
