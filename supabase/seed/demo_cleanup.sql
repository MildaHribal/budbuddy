-- Removes the demo community: every *@demo.budbuddy.invalid user and, via cascades, all their rows.
-- Photos live in Storage (media/de3a0000-…/demo/): remove them with `sh supabase/seed/demo_media.sh rm`.
-- Apply: npx supabase db query --linked --project-ref mlvpmiwvuxgwjssrtxsq -f supabase/seed/demo_cleanup.sql

begin;
-- profiles first (cascades to posts, comments, reactions, follows, plants, updates, tips, reports, entries, votes,
-- badges, notifications); deleting auth.users directly trips the reputation trigger on other demo profiles
do $$ declare u uuid; begin
  -- one row per command: each delete's reputation trigger updates the other demo profiles
  for u in select id from auth.users where email like '%@demo.budbuddy.invalid' loop
    delete from public.profiles where id = u;
  end loop;
end $$;
delete from auth.users where email like '%@demo.budbuddy.invalid';
delete from private.rate_log where user_id::text like 'de3a0000-%';
commit;
