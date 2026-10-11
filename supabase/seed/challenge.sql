-- First monthly challenge (October 2026): entries 1st–25th, voting until the month's end.
-- Times are Europe/Prague local boundaries. Safe to re-run.
insert into public.challenges (slug, title, description, starts_at, ends_at, voting_ends_at)
values (
  'first-grow-2026-10',
  'My first grow',
  'Show us the plant that started it all – your first grow, or the one you are on right now. Seedling, monster or happy accident: share one photo and tell us what you learned.',
  timestamptz '2026-10-01 00:00:00 Europe/Prague',
  timestamptz '2026-10-25 23:59:59 Europe/Prague',
  timestamptz '2026-10-31 23:59:59 Europe/Prague'
)
on conflict (slug) do nothing;
