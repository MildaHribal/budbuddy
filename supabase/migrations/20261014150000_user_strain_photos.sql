-- User photos in the strain catalogue: uploads wait for admin review, consent is stored per photo,
-- curated rows (user_id null) stay approved.

alter table public.strain_photos
  add column if not exists user_id uuid references public.profiles on delete cascade,
  add column if not exists status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  add column if not exists reject_reason text check (char_length(reject_reason) <= 200),
  add column if not exists consent_display boolean,
  add column if not exists consent_training boolean not null default false,
  add column if not exists reviewed_by uuid references public.profiles on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.strain_photos drop constraint if exists strain_photos_user_consent;
alter table public.strain_photos add constraint strain_photos_user_consent
  check (user_id is null or consent_display is true);

create index if not exists strain_photos_user on public.strain_photos (user_id) where user_id is not null;
create index if not exists strain_photos_pending on public.strain_photos (created_at) where status = 'pending';

-- ── Daily upload quota (UTC day, same upsert pattern as private.ai_take) ──
create table if not exists private.strain_photo_quota (
  user_id uuid not null,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
revoke all on private.strain_photo_quota from public, anon, authenticated;

-- true when url is the public URL of an existing media/<owner>/strain-photos/<id>.jpg object
create or replace function private.own_media_object(url text, owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select url is not null and owner is not null and char_length(url) <= 300
    and url ~ ('^https://mlvpmiwvuxgwjssrtxsq\.supabase\.co/storage/v1/object/public/media/'
      || owner::text || '/strain-photos/[A-Za-z0-9_-]{1,80}\.jpg$')
    and exists (select 1 from storage.objects o where o.bucket_id = 'media'
      and o.name = substr(url, char_length('https://mlvpmiwvuxgwjssrtxsq.supabase.co/storage/v1/object/public/media/') + 1))
$$;
revoke all on function private.own_media_object(text, uuid) from public, anon, authenticated;

-- ── Insert: everything except the photo, kind, size and consents is decided here ──
create or replace function private.strain_photo_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  handle text;
  taken int;
  today date := (now() at time zone 'utc')::date;
begin
  if private.trusted() then return new; end if;
  if uid is null then raise exception 'sign in to add photos'; end if;
  select username::text into handle from profiles where id = uid;
  if handle is null then raise exception 'profile missing'; end if;
  if not exists (select 1 from strains where id = new.strain_id and approved) then
    raise exception 'strain not found';
  end if;
  if new.consent_display is not true then raise exception 'consent required'; end if;
  if not private.own_media_object(new.url, uid) then
    raise exception 'photo must be uploaded to your own media folder';
  end if;
  if new.thumb_url is not null and not private.own_media_object(new.thumb_url, uid) then
    raise exception 'thumbnail must be uploaded to your own media folder';
  end if;
  if new.width is not null and new.width not between 1 and 4000
    or new.height is not null and new.height not between 1 and 4000 then
    raise exception 'invalid size';
  end if;

  insert into private.strain_photo_quota as q (user_id, day, n) values (uid, today, 1)
  on conflict (user_id, day) do update set n = q.n + 1 where q.n < 10
  returning n into taken;
  if taken is null then raise exception 'rate limit: daily photo limit' using errcode = 'P0001'; end if;
  delete from private.strain_photo_quota where user_id = uid and day < today;

  new.id := gen_random_uuid();
  new.user_id := uid;
  new.status := 'pending';
  new.reject_reason := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.author := '@' || handle;
  new.license := 'BudBuddy user licence';
  new.license_url := 'https://budbuddy.hribal.site/terms.html';
  new.source_url := '/u/' || handle;
  new.fit := 'cover';
  new.sort := 0;
  new.consent_training := coalesce(new.consent_training, false);
  new.created_at := now();
  return new;
end $$;
revoke execute on function private.strain_photo_insert() from public, anon, authenticated;
drop trigger if exists strain_photos_1_insert on public.strain_photos;
create trigger strain_photos_1_insert before insert on public.strain_photos
  for each row execute function private.strain_photo_insert();

-- ── Update: admins review; the photo itself and the consents never change ──
create or replace function private.strain_photo_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.trusted() then return new; end if;
  if not private.is_admin() then raise exception 'admin only'; end if;
  new.id := old.id; new.strain_id := old.strain_id; new.user_id := old.user_id;
  new.url := old.url; new.thumb_url := old.thumb_url;
  new.consent_display := old.consent_display; new.consent_training := old.consent_training;
  new.created_at := old.created_at;
  new.reject_reason := case when new.status = 'rejected' then nullif(btrim(new.reject_reason), '') end;
  if new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  else
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end $$;
revoke execute on function private.strain_photo_update() from public, anon, authenticated;
drop trigger if exists strain_photos_1_update on public.strain_photos;
create trigger strain_photos_1_update before update on public.strain_photos
  for each row execute function private.strain_photo_update();

-- ── Tell the uploader when a review is done ──
create or replace function private.on_strain_photo_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare s strains;
begin
  if new.user_id is null or new.status is not distinct from old.status
    or new.status not in ('approved', 'rejected') then
    return null;
  end if;
  select * into s from strains where id = new.strain_id;
  perform private.notify(new.user_id, null, 'moderation', null, null, jsonb_strip_nulls(jsonb_build_object(
    'target_type', 'strain_photo', 'target_id', new.id, 'status', new.status,
    'slug', s.slug, 'strain', s.name, 'reason', new.reject_reason)));
  return null;
end $$;
revoke execute on function private.on_strain_photo_review() from public, anon, authenticated;
drop trigger if exists strain_photos_reviewed on public.strain_photos;
create trigger strain_photos_reviewed after update of status on public.strain_photos
  for each row execute function private.on_strain_photo_review();

-- ── Credit follows a username change ──
create or replace function private.on_username_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update strain_photos set author = '@' || new.username::text, source_url = '/u/' || new.username::text
    where user_id = new.id;
  return null;
end $$;
revoke execute on function private.on_username_change() from public, anon, authenticated;
drop trigger if exists profiles_username_photos on public.profiles;
create trigger profiles_username_photos after update of username on public.profiles
  for each row when (new.username is distinct from old.username)
  execute function private.on_username_change();

-- ── RLS ──
drop policy if exists "strain photos readable" on public.strain_photos;
create policy "strain photos readable" on public.strain_photos for select using (
  (status = 'approved' and not private.blocked_me(user_id))
  or (user_id is not null and user_id = auth.uid())
  or private.is_admin());

drop policy if exists "own strain photos insert" on public.strain_photos;
create policy "own strain photos insert" on public.strain_photos for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and private.can_post());

drop policy if exists "admin strain photos update" on public.strain_photos;
create policy "admin strain photos update" on public.strain_photos for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "own strain photos delete" on public.strain_photos;
create policy "own strain photos delete" on public.strain_photos for delete to authenticated
  using ((user_id is not null and user_id = auth.uid()) or private.is_admin());

-- column privileges: the client can only send the photo, kind, size and consents; admins only review
revoke all on public.strain_photos from anon, authenticated;
grant select (id, strain_id, kind, url, thumb_url, width, height, author, license, license_url, source_url,
  sort, created_at, fit, user_id, status) on public.strain_photos to anon;
grant select on public.strain_photos to authenticated;
grant insert (strain_id, kind, url, thumb_url, width, height, consent_display, consent_training)
  on public.strain_photos to authenticated;
grant update (status, reject_reason) on public.strain_photos to authenticated;
grant delete on public.strain_photos to authenticated;

-- ── Reports: user photos are reportable; three trusted reports send one back to review ──
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'tip', 'profile', 'plant', 'strain', 'entry', 'ai', 'strain_photo'));

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
      when 'strain_photo' then
        update strain_photos set status = 'pending' where id = new.target_id and user_id is not null and status = 'approved';
      else null;
    end case;
  end if;
  return null;
end $$;
revoke execute on function public.on_report() from public, anon, authenticated;
