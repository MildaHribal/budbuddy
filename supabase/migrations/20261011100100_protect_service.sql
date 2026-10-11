-- Let the service role and SQL editor run moderation updates.
create or replace function public.protect_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- nested = fired by another trigger (counters, reputation, auto-hide)
  -- service role / SQL editor (no JWT) and nested triggers may change everything
  if auth.uid() is null or private.is_admin() or pg_trigger_depth() > 1 then return new; end if;
  if tg_table_name = 'profiles' then
    new.is_admin := old.is_admin; new.is_banned := old.is_banned; new.reputation := old.reputation;
  elsif tg_table_name = 'posts' then
    new.is_hidden := old.is_hidden; new.likes_count := old.likes_count; new.comments_count := old.comments_count;
    new.author_id := old.author_id; new.created_at := old.created_at;
  elsif tg_table_name = 'comments' then
    new.is_hidden := old.is_hidden; new.likes_count := old.likes_count; new.is_ai := old.is_ai; new.author_id := old.author_id;
  elsif tg_table_name = 'tips' then
    new.is_hidden := old.is_hidden; new.helpful_count := old.helpful_count; new.unhelpful_count := old.unhelpful_count; new.score := old.score;
  elsif tg_table_name = 'public_plants' then
    new.is_hidden := old.is_hidden; new.owner_id := old.owner_id;
  elsif tg_table_name = 'strains' then
    new.approved := old.approved;
  elsif tg_table_name = 'challenge_entries' then
    new.votes_count := old.votes_count; new.is_hidden := old.is_hidden;
  end if;
  return new;
end $$;
revoke execute on function public.protect_columns() from public, anon, authenticated;
