-- Curated, freely licensed catalogue photos (plant and flower) per strain.
create table public.strain_photos (
  id uuid primary key default gen_random_uuid(),
  strain_id uuid not null references public.strains on delete cascade,
  kind text not null check (kind in ('plant', 'bud')),
  url text not null,
  thumb_url text,
  width smallint,
  height smallint,
  author text not null check (char_length(author) <= 120),
  license text not null check (char_length(license) <= 40),
  license_url text,
  source_url text not null,
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);

create index strain_photos_strain on public.strain_photos (strain_id, sort);

alter table public.strain_photos enable row level security;
create policy "strain photos readable" on public.strain_photos for select using (true);
grant select on public.strain_photos to anon, authenticated;
