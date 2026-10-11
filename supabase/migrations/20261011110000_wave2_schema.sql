-- Wave 2 schema: help requests, reactions, badges, weekly diary updates, discovery,
-- challenges 2.0, strain report tags, Czech content columns.

-- ── Posts: help requests ──
alter table public.posts
  add column status text not null default 'open' check (status in ('open', 'solved')),
  add column solved_at timestamptz,
  add column pinged_at timestamptz,
  add column symptom_tags text[] not null default '{}' check (cardinality(symptom_tags) <= 6 and symptom_tags <@
    array['yellowing', 'spots', 'burn', 'claw', 'droop', 'curl', 'purple', 'pests', 'mould', 'slow', 'other']::text[]),
  add column reactions jsonb not null default '{}';
update public.posts set status = 'solved', solved_at = coalesce(edited_at, created_at) where accepted_comment_id is not null;
create index posts_unanswered_idx on public.posts (created_at desc)
  where category in ('question', 'problem') and status = 'open' and comments_count = 0 and not is_hidden;
create index posts_open_help_idx on public.posts (created_at) where category in ('question', 'problem') and status = 'open';

-- ── Reactions (post_likes stays for old clients and mirrors kind 'like') ──
create table public.post_reactions (
  user_id uuid not null references public.profiles on delete cascade,
  post_id uuid not null references public.posts on delete cascade,
  kind text not null check (kind in ('like', 'healthy', 'training', 'frosty', 'helpful')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, kind)
);
create index post_reactions_post_idx on public.post_reactions (post_id);
alter table public.post_reactions enable row level security;
create policy "reactions readable" on public.post_reactions for select using (true);
create policy "own reactions insert" on public.post_reactions for insert with check (user_id = auth.uid() and private.can_post());
create policy "own reactions delete" on public.post_reactions for delete using (user_id = auth.uid());

insert into public.post_reactions (user_id, post_id, kind, created_at)
  select user_id, post_id, 'like', created_at from public.post_likes on conflict do nothing;
update public.reputation_events set kind = 'reaction' where kind = 'like';
update public.posts p set
  likes_count = coalesce((select count(*) from public.post_reactions r where r.post_id = p.id), 0),
  reactions = coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from public.post_reactions r
    where r.post_id = p.id group by kind) k), '{}');

-- ── Notifications ──
alter table public.notifications add column meta jsonb;
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('like', 'reaction', 'comment',
  'reply', 'follow', 'accepted', 'tip_vote', 'challenge', 'moderation', 'badge', 'solve_ping', 'update'));

-- ── Badges ──
create table public.badges (
  id text primary key,
  name_en text not null,
  name_cs text not null,
  desc_en text not null,
  desc_cs text not null,
  glyph text not null,
  tier smallint not null default 1 check (tier between 1 and 3)
);
insert into public.badges (id, name_en, name_cs, desc_en, desc_cs, glyph, tier) values
  ('first_post', 'First post', 'První příspěvek', 'Shared a first post with the community.', 'Sdílel první příspěvek s komunitou.', 'note', 1),
  ('first_answer', 'First best answer', 'První nejlepší odpověď', 'Gave an answer that was marked as the best one.', 'Tvoje odpověď byla poprvé označena jako nejlepší.', 'guide', 1),
  ('helper_10', 'Helper', 'Pomocník', '10 answers marked as the best one.', '10 odpovědí označených jako nejlepší.', 'community', 3),
  ('tip_master', 'Tip master', 'Mistr tipů', 'A tip that at least 10 growers found helpful.', 'Tip, který pomohl aspoň 10 pěstitelům.', 'lamp', 2),
  ('first_harvest', 'First harvest', 'První sklizeň', 'Shared a plant with its dry harvest weight.', 'Sdílel rostlinu i se suchou váhou sklizně.', 'harvest', 2),
  ('diary_keeper', 'Diary keeper', 'Kronikář', 'Posted 6 weekly updates on one plant.', 'Přidal 6 týdenních zápisů k jedné rostlině.', 'gallery', 2),
  ('challenger', 'Challenger', 'Vyzyvatel', 'Entered a monthly challenge.', 'Zapojil se do měsíční výzvy.', 'flowering', 1),
  ('challenge_winner', 'Challenge podium', 'Na stupních vítězů', 'Finished in the top 3 of a challenge.', 'Skončil v první trojici výzvy.', 'spark', 3),
  ('welcome', 'Welcoming', 'Vstřícný', 'Answered 3 posts from first-time growers.', 'Odpověděl na 3 příspěvky začínajících pěstitelů.', 'seedling', 2),
  ('veteran', 'Veteran', 'Veterán', 'Part of the community for a year.', 'V komunitě už rok.', 'vegetative', 2);
alter table public.badges enable row level security;
create policy "badges readable" on public.badges for select using (true);

create table public.user_badges (
  user_id uuid not null references public.profiles on delete cascade,
  badge_id text not null references public.badges on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "user badges readable" on public.user_badges for select using (true);

-- ── Profiles: discovery + pinned badges ──
alter table public.profiles
  add column pinned_badges text[] not null default '{}' check (cardinality(pinned_badges) <= 3),
  add column first_grow boolean not null default true,
  add column light_type text check (light_type in ('led', 'hps', 'cfl', 'sun', 'mixed')),
  add column space text check (char_length(space) <= 24);

-- ── Weekly diary updates ──
create table public.plant_updates (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.public_plants on delete cascade,
  owner_id uuid not null references public.profiles on delete cascade,
  week_no smallint not null check (week_no between 1 and 60),
  body text not null default '' check (char_length(body) <= 1000),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  journal_summary jsonb check (pg_column_size(journal_summary) <= 4096),
  created_at timestamptz not null default now(),
  unique (plant_id, week_no)
);
create index plant_updates_plant_idx on public.plant_updates (plant_id, week_no desc);
create index plant_updates_owner_idx on public.plant_updates (owner_id, created_at desc);
alter table public.plant_updates enable row level security;
create policy "updates readable" on public.plant_updates for select using (
  exists (select 1 from public.public_plants p where p.id = plant_id));
create policy "own updates insert" on public.plant_updates for insert with check (owner_id = auth.uid() and private.can_post());
create policy "own updates update" on public.plant_updates for update using ((owner_id = auth.uid() and private.can_post()) or private.is_admin());
create policy "own updates delete" on public.plant_updates for delete using (owner_id = auth.uid() or private.is_admin());

alter table public.public_plants add column updated_weeks int not null default 0;

-- ── Challenges 2.0 ──
alter table public.challenges
  add column title_cs text check (char_length(title_cs) <= 120),
  add column description_cs text check (char_length(description_cs) <= 2000),
  add column finalized_at timestamptz;

-- votes stay hidden until voting ends (admins always see them)
create view public.challenge_entries_public with (security_invoker = true) as
  select e.id, e.challenge_id, e.user_id, e.plant_id, e.image_url, e.caption,
    case when now() > c.voting_ends_at or private.is_admin() then e.votes_count end as votes_count,
    e.is_hidden, e.created_at
  from public.challenge_entries e join public.challenges c on c.id = e.challenge_id;
grant select on public.challenge_entries_public to anon, authenticated;

-- ── Strains ──
alter table public.strain_reports
  add column medium text check (char_length(medium) <= 30),
  add column tags text[] not null default '{}' check (cardinality(tags) <= 6
    and array_to_string(tags, ',') ~ '^([a-z][a-z-]{1,23}(,|$))*$');
alter table public.strains add column description_cs text check (char_length(description_cs) <= 1200);

-- ── Size limits on free-form arrays ──
alter table public.posts add constraint posts_tags_size check (char_length(array_to_string(tags, ',')) <= 300);
alter table public.profiles add constraint profiles_arrays_size check (
  cardinality(environments) <= 8 and cardinality(media) <= 8
  and char_length(array_to_string(environments, ',')) <= 200 and char_length(array_to_string(media, ',')) <= 200);
