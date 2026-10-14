-- Breeder-permitted photos: original-breeder credit with a link, and whole-plant display (no crop).
alter table public.strains
  add column if not exists original_breeder boolean not null default false,
  add column if not exists breeder_url text check (breeder_url is null or (breeder_url ~ '^https://' and char_length(breeder_url) <= 300));

alter table public.strain_photos
  add column if not exists fit text not null default 'cover' check (fit in ('cover', 'contain'));

create or replace function private.strain_insert_sanitize() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.trusted() or private.is_admin() then return new; end if;
  new.image_url := null;
  new.image_credit := null;
  new.approved := false;
  new.original_breeder := false;
  new.breeder_url := null;
  new.created_at := now();
  return new;
end $$;
revoke execute on function private.strain_insert_sanitize() from public, anon, authenticated;

-- Serious Seeds (terms 2026-10-14, store/PHOTO_PERMISSIONS.md)
update public.strains set original_breeder = true, breeder_url = 'https://www.seriousseeds.com/cannabis-seeds/' || slug
  where breeder = 'Serious Seeds' and slug in ('ak-47', 'white-russian', 'kali-mist', 'bubble-gum', 'motavation', 'chronic');
