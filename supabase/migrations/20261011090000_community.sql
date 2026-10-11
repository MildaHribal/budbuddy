-- BudBuddy community schema: profiles, public plants, feed, Q&A, tips, strains,
-- challenges, moderation and notifications. All tables use RLS.

create extension if not exists citext;

-- ── Helpers ──────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username citext unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 40),
  avatar_url text,
  bio text check (char_length(bio) <= 300),
  experience text not null default 'beginner' check (experience in ('beginner', 'intermediate', 'advanced', 'expert')),
  environments text[] not null default '{}',
  media text[] not null default '{}',
  favorite_strain text check (char_length(favorite_strain) <= 60),
  reputation int not null default 0,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.can_post() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_banned)
$$;

-- new auth user → profile with a unique handle from the email
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := lower(regexp_replace(split_part(coalesce(new.email, 'grower'), '@', 1), '[^a-z0-9_]', '', 'gi'));
  handle text;
begin
  base := left(case when char_length(base) < 3 then 'grower' else base end, 14);
  handle := base;
  while exists (select 1 from public.profiles where username = handle) loop
    handle := base || '_' || substr(md5(random()::text), 1, 4);
  end loop;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, handle,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', handle), 40),
    new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Strains ──────────────────────────────────────────────────────────

create table public.strains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 60),
  breeder text check (char_length(breeder) <= 60),
  dominance text check (dominance in ('indica', 'sativa', 'hybrid')),
  flowering text check (flowering in ('auto', 'photo')),
  flowering_weeks_min smallint check (flowering_weeks_min between 4 and 20),
  flowering_weeks_max smallint check (flowering_weeks_max between 4 and 20),
  description text check (char_length(description) <= 1200),
  image_url text,
  image_credit text,
  created_by uuid references public.profiles on delete set null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Public plants (opt-in mirror of a local plant) ──────────────────

create table public.public_plants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  local_id text not null,
  name text not null check (char_length(name) between 1 and 60),
  strain text check (char_length(strain) <= 60),
  strain_id uuid references public.strains on delete set null,
  plant_type text check (plant_type in ('photoperiod', 'autoflower')),
  stage text not null,
  environment text,
  medium text,
  start_date date,
  cover_url text,
  harvest_wet_g numeric check (harvest_wet_g >= 0),
  harvest_dry_g numeric check (harvest_dry_g >= 0),
  archived boolean not null default false,
  timeline jsonb not null default '[]',
  is_hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (owner_id, local_id)
);

-- ── Feed ─────────────────────────────────────────────────────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  category text not null check (category in ('plants', 'question', 'harvest', 'problem', 'gear', 'outdoor', 'general')),
  title text check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 4000),
  images text[] not null default '{}' check (cardinality(images) <= 6),
  plant_id uuid references public.public_plants on delete set null,
  plant_context jsonb,
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  likes_count int not null default 0,
  comments_count int not null default 0,
  accepted_comment_id uuid,
  is_hidden boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_category_idx on public.posts (category, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid references public.profiles on delete cascade,
  parent_id uuid references public.comments on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_ai boolean not null default false,
  likes_count int not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (is_ai or author_id is not null)
);
create index comments_post_idx on public.comments (post_id, created_at);

alter table public.posts add constraint posts_accepted_fk
  foreign key (accepted_comment_id) references public.comments on delete set null;

create table public.post_likes (
  user_id uuid not null references public.profiles on delete cascade,
  post_id uuid not null references public.posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table public.comment_likes (
  user_id uuid not null references public.profiles on delete cascade,
  comment_id uuid not null references public.comments on delete cascade,
  primary key (user_id, comment_id)
);

create table public.saves (
  user_id uuid not null references public.profiles on delete cascade,
  post_id uuid not null references public.posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ── Tips ─────────────────────────────────────────────────────────────

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 10 and 500),
  stage text,
  medium text,
  environment text,
  helpful_count int not null default 0,
  unhelpful_count int not null default 0,
  score double precision not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index tips_score_idx on public.tips (score desc);

create table public.tip_votes (
  user_id uuid not null references public.profiles on delete cascade,
  tip_id uuid not null references public.tips on delete cascade,
  value smallint not null check (value in (-1, 1)),
  primary key (user_id, tip_id)
);

create table public.strain_reports (
  id uuid primary key default gen_random_uuid(),
  strain_id uuid not null references public.strains on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  plant_id uuid references public.public_plants on delete set null,
  flowering_days smallint check (flowering_days between 20 and 200),
  yield_g numeric check (yield_g >= 0),
  difficulty smallint check (difficulty between 1 and 5),
  rating smallint check (rating between 1 and 5),
  notes text check (char_length(notes) <= 600),
  created_at timestamptz not null default now(),
  unique (strain_id, user_id, plant_id)
);

create view public.strain_stats with (security_invoker = true) as
  select s.id as strain_id, count(r.id) as reports,
    round(avg(r.flowering_days)) as avg_flowering_days,
    round(avg(r.yield_g)) as avg_yield_g,
    round(avg(r.difficulty)::numeric, 1) as avg_difficulty,
    round(avg(r.rating)::numeric, 1) as avg_rating
  from public.strains s left join public.strain_reports r on r.strain_id = s.id
  group by s.id;

-- ── Monthly challenges ──────────────────────────────────────────────

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  cover_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  voting_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at and ends_at <= voting_ends_at)
);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  plant_id uuid references public.public_plants on delete set null,
  image_url text not null,
  caption text check (char_length(caption) <= 300),
  votes_count int not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create table public.challenge_votes (
  user_id uuid not null references public.profiles on delete cascade,
  challenge_id uuid not null references public.challenges on delete cascade,
  entry_id uuid not null references public.challenge_entries on delete cascade,
  primary key (user_id, challenge_id)
);

-- ── Moderation & notifications ──────────────────────────────────────

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'tip', 'profile', 'plant', 'strain', 'entry')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'sale', 'abuse', 'nsfw', 'minor', 'personal', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  primary key (blocker_id, blocked_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  actor_id uuid references public.profiles on delete cascade,
  type text not null check (type in ('like', 'comment', 'reply', 'follow', 'accepted', 'tip_vote', 'challenge', 'moderation')),
  post_id uuid references public.posts on delete cascade,
  comment_id uuid references public.comments on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
