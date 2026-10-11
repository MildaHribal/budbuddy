-- Let internal triggers update counters; sanitize client inserts.

create or replace function public.protect_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- nested = fired by another trigger (counters, reputation, auto-hide)
  if private.is_admin() or pg_trigger_depth() > 1 then return new; end if;
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

create or replace function public.sanitize_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if private.is_admin() or pg_trigger_depth() > 1 or auth.uid() is null then return new; end if;
  if tg_table_name = 'posts' then
    new.likes_count := 0; new.comments_count := 0; new.is_hidden := false; new.accepted_comment_id := null;
    new.edited_at := null; new.created_at := now();
  elsif tg_table_name = 'comments' then
    new.likes_count := 0; new.is_hidden := false; new.created_at := now();
  elsif tg_table_name = 'tips' then
    new.helpful_count := 0; new.unhelpful_count := 0; new.score := 0; new.is_hidden := false; new.created_at := now();
  elsif tg_table_name = 'public_plants' then
    new.is_hidden := false;
  elsif tg_table_name = 'challenge_entries' then
    new.votes_count := 0; new.is_hidden := false;
  elsif tg_table_name = 'reports' then
    new.status := 'open'; new.resolved_by := null;
  end if;
  return new;
end $$;

create trigger posts_sanitize before insert on public.posts for each row execute function public.sanitize_insert();
create trigger comments_sanitize before insert on public.comments for each row execute function public.sanitize_insert();
create trigger tips_sanitize before insert on public.tips for each row execute function public.sanitize_insert();
create trigger plants_sanitize before insert on public.public_plants for each row execute function public.sanitize_insert();
create trigger entries_sanitize before insert on public.challenge_entries for each row execute function public.sanitize_insert();
create trigger reports_sanitize before insert on public.reports for each row execute function public.sanitize_insert();
create trigger entries_protect before update on public.challenge_entries for each row execute function public.protect_columns();

revoke execute on function public.protect_columns() from public, anon, authenticated;
revoke execute on function public.sanitize_insert() from public, anon, authenticated;
