-- Play-policy content filter: no contact details, no buying/selling cannabis products.
-- Raises 'content_blocked:contact' or 'content_blocked:sale'.

create or replace function private.content_violation(txt text) returns text
language plpgsql immutable set search_path = public as $$
declare
  t text;
  p text;
  sale constant text := '(\msell|\mselling\M|\msold\M|for sale|\mbuy(ing)?\M|\mprice[sd]?\M|\mpay(ing)?\M|\mcash\M|\mship(ping|ped)?\M|'
    || '\mdeliver(y|ies)?\M|\mprod[aá]m|\mprod[aá]v[aá]m|\mkoup[ií]m|\mcen[auyě]\M|\mkč\M|\mczk\M|\meur\M|\musd\M|€|\$|\d\s*(kč|czk|eur|usd)\M)';
  product constant text := '(\mclones?\M|\mseeds?\M|\mweed\M|\mbuds?\M|\mgrams?\M|\moz\M|\mounces?\M|\mř[ií]z(e)?k|\mriz(e)?k|'
    || '\msem[ií]nk|\mtr[aá]v[auyěo]\M|\mgram[uůy]?\M|\d\s*(g|oz)\M)';
begin
  if txt is null or txt = '' then return null; end if;
  t := lower(txt);
  -- e-mail
  if t ~ '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}' then return 'contact'; end if;
  -- messengers
  if t ~ '(t\.me/|telegram|wa\.me|whatsapp|signal\.me|signal\.group|wickr|threema|snapchat|\msnap ?id\M|\mkik\M|\mviber\M|discord\.gg)' then
    return 'contact';
  end if;
  -- phone numbers: +xx…, 9+ digits in a row, or 3-3-3(-4) groups (measurements with units don't count)
  p := regexp_replace(t, '\d+\s*(µmol|umol|ppfd|ppm|lux|lm\M|lumens?|w\M|watts?|ml\M|cm\M|mm\M|g\M|k\M|°|%|h\M)', ' ', 'g');
  p := regexp_replace(p, '(ppfd|ppm|µmol|umol|lux|lumens?|watts?|\mec\M|\mph\M|\mvpd\M|\mdli\M)[\s:=]*[\d\s.,/-]*', ' ', 'g');
  if p ~ '\+\s?\d{1,3}([\s.()-]*\d){7,}'
    or p ~ '(^|[^\d.,])\d{9,15}($|[^\d.,])'
    or p ~ '(^|[^\d.,])\(?\d{3}\)?[ .-]\d{3}[ .-]\d{3,4}($|[^\d.,])' then
    return 'contact';
  end if;
  -- harmless phrases that look like sale talk
  t := regexp_replace(t, '(pay(ing)? (close )?attention|nutrient delivery|water delivery|oxygen delivery|delivery system|(price|cost) of (an? |the )?(led|light|lamp|tent|fan|filter|soil|coco|nutrient|electricity|power)s?|cen[auyě] (za )?(světla|lamp[yu]?|led|stanu|ventilátoru|filtru|hnojiv|substrátu|elektřiny|proudu))', ' ', 'g');
  if t ~ (sale || '.{0,30}' || product) or t ~ (product || '.{0,30}' || sale) then return 'sale'; end if;
  return null;
end $$;

create or replace function public.check_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  col text; v text; o text; why text;
begin
  -- service role / SQL editor and nested triggers are trusted
  if auth.uid() is null or pg_trigger_depth() > 1 then return new; end if;
  foreach col in array tg_argv loop
    v := to_jsonb(new) ->> col;
    if tg_op = 'UPDATE' then
      o := to_jsonb(old) ->> col;
      continue when v is not distinct from o;
    end if;
    why := private.content_violation(v);
    if why is not null then
      raise exception 'content_blocked:%', why using errcode = 'P0001', hint = col;
    end if;
  end loop;
  return new;
end $$;

create trigger posts_content before insert or update on public.posts
  for each row execute function public.check_content('title', 'body');
create trigger comments_content before insert or update on public.comments
  for each row execute function public.check_content('body');
create trigger tips_content before insert or update on public.tips
  for each row execute function public.check_content('body');
create trigger profiles_content before update on public.profiles
  for each row execute function public.check_content('bio', 'display_name');
create trigger entries_content before insert or update on public.challenge_entries
  for each row execute function public.check_content('caption');
create trigger plant_updates_content before insert or update on public.plant_updates
  for each row execute function public.check_content('body');
create trigger strain_reports_content before insert or update on public.strain_reports
  for each row execute function public.check_content('notes');

revoke execute on function public.check_content() from public, anon, authenticated;
revoke execute on function private.content_violation(text) from public, anon, authenticated;
