-- Content filter: trading, swapping and giving away plants or seeds count as "sale" too.
create or replace function private.content_violation(txt text) returns text
language plpgsql immutable set search_path = public as $$
declare
  t text;
  p text;
  sale constant text := '(\msell|\mselling\M|\msold\M|for sale|\mbuy(ing)?\M|\mprice[sd]?\M|\mpay(ing)?\M|\mcash\M|\mship(ping|ped)?\M|'
    || '\mdeliver(y|ies)?\M|\m(will|wanna|want to|willing to|happy to|can) (trade|swap)\M|\m(trade|swap) (you|ya)\M|'
    || '\m(up )?for (trade|swap)\M|\mgiv(e|ing) ?away\M|\mfor free\M|'
    || '\mprod[aá]m|\mprod[aá]v[aá]m|\mkoup[ií]m|\mvyměním\M|\mvýměnou za\M|\mdaruj|\mzdarma\M|\mzadarmo\M|'
    || '\mcen[auyě]\M|\mkč\M|\mczk\M|\meur\M|\musd\M|€|\$|\d\s*(kč|czk|eur|usd)\M)';
  product constant text := '(\mclones?\M|\mcuttings?\M|\mseeds?\M|\mweed\M|\mbuds?\M|\mgrams?\M|\moz\M|\mounces?\M|\mř[ií]z(e)?k|\mriz(e)?k|'
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
  t := regexp_replace(t, '(pay(ing)? (close )?attention|nutrient delivery|water delivery|oxygen delivery|delivery system|air exchange|gas exchange|(price|cost) of (an? |the )?(led|light|lamp|tent|fan|filter|soil|coco|nutrient|electricity|power)s?|cen[auyě] (za )?(světla|lamp[yu]?|led|stanu|ventilátoru|filtru|hnojiv|substrátu|elektřiny|proudu))', ' ', 'g');
  if t ~ (sale || '.{0,30}' || product) or t ~ (product || '.{0,30}' || sale) or t ~ '\mfree (seeds?|clones?|cuttings?)\M' then return 'sale'; end if;
  return null;
end $$;
revoke execute on function private.content_violation(text) from public, anon, authenticated;
