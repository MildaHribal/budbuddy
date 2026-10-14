-- Account deletion requests from the web form (public/delete-account.html → edge function
-- deletion-request, service role). No e-mail is sent; admins read them via admin_deletion_requests().

create table if not exists private.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact text check (char_length(contact) <= 254),
  username text check (char_length(username) <= 60),
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'done', 'rejected')),
  handled_at timestamptz,
  check (contact is not null or username is not null)
);
create index if not exists deletion_requests_created on private.deletion_requests (created_at desc);
revoke all on private.deletion_requests from public, anon, authenticated;

-- 'ok' | 'duplicate'; raises when the global brake trips
create or replace function public.submit_deletion_request(contact text, username text, note text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  c text := nullif(left(btrim(contact), 254), '');
  u text := nullif(left(lower(ltrim(btrim(username), '@')), 60), '');
begin
  if c is null and u is null then raise exception 'contact or username required' using errcode = '22023'; end if;
  if (select count(*) from private.deletion_requests where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'rate limit: too many deletion requests' using errcode = 'P0001';
  end if;
  if exists (select 1 from private.deletion_requests r where r.status = 'open'
      and r.created_at > now() - interval '1 day'
      and lower(r.contact) is not distinct from lower(c) and r.username is not distinct from u) then
    return 'duplicate';
  end if;
  insert into private.deletion_requests (contact, username, note) values (c, u, nullif(left(btrim(note), 1000), ''));
  return 'ok';
end $$;
revoke all on function public.submit_deletion_request(text, text, text) from public, anon, authenticated;
grant execute on function public.submit_deletion_request(text, text, text) to service_role;

-- admin view with the matching account (by e-mail or username), if any
create or replace function public.admin_deletion_requests(include_handled boolean default false)
returns table (id uuid, created_at timestamptz, contact text, username text, note text, status text,
  handled_at timestamptz, user_id uuid, matched_username text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return query
    select r.id, r.created_at, r.contact, r.username, r.note, r.status, r.handled_at, p.id, p.username::text
    from private.deletion_requests r
    left join lateral (
      select pr.id, pr.username from public.profiles pr
      where (r.username is not null and pr.username::text = r.username)
         or (r.contact is not null and pr.id in (select au.id from auth.users au where lower(au.email) = lower(r.contact)))
      limit 1) p on true
    where include_handled or r.status = 'open'
    order by r.created_at desc
    limit 500;
end $$;
revoke all on function public.admin_deletion_requests(boolean) from public, anon;
grant execute on function public.admin_deletion_requests(boolean) to authenticated;

create or replace function public.admin_resolve_deletion_request(request uuid, new_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if new_status not in ('open', 'done', 'rejected') then raise exception 'invalid status' using errcode = '22023'; end if;
  update private.deletion_requests set status = new_status,
    handled_at = case when new_status = 'open' then null else now() end
  where id = request;
end $$;
revoke all on function public.admin_resolve_deletion_request(uuid, text) from public, anon;
grant execute on function public.admin_resolve_deletion_request(uuid, text) to authenticated;
