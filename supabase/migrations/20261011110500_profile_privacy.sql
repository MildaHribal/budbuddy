-- H1: ban state and terms timestamp are not public. A column REVOKE does nothing while the
-- table-level grant exists, so anon gets an explicit column list instead.
-- New profile columns must be added to this grant to be readable signed-out.
revoke select on public.profiles from anon;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name not in ('is_banned', 'accepted_terms_at');
  execute format('grant select (%s) on public.profiles to anon', cols);
end $$;
