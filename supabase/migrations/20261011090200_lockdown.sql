-- Keep helper functions out of the public RPC API.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_admin() set schema private;
alter function public.can_post() set schema private;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.can_post() to anon, authenticated;

-- trigger / internal functions are never called directly
do $$
declare f text;
begin
  foreach f in array array[
    'public.handle_new_user()', 'public.notify(uuid, uuid, text, uuid, uuid)', 'public.on_post_like()',
    'public.on_comment_like()', 'public.on_comment()', 'public.on_follow()', 'public.on_accept()',
    'public.on_tip_vote()', 'public.on_challenge_vote()', 'public.check_challenge_vote()',
    'public.check_challenge_entry()', 'public.rate_limit()', 'public.on_report()', 'public.protect_columns()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

alter function public.wilson(int, int) set search_path = public;

create schema if not exists extensions;
alter extension citext set schema extensions;

-- function bodies resolve names at runtime: point at the moved helper
create or replace function public.protect_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.is_admin() then return new; end if;
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
  end if;
  return new;
end $$;
revoke execute on function public.protect_columns() from public, anon, authenticated;
