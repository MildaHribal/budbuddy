-- Age (18+) and terms confirmation, recorded on first sign-in.
alter table public.profiles add column accepted_terms_at timestamptz;

create or replace function public.accept_terms() returns void
language sql security definer set search_path = public as $$
  update profiles set accepted_terms_at = now() where id = auth.uid() and accepted_terms_at is null
$$;
revoke all on function public.accept_terms() from public, anon;
grant execute on function public.accept_terms() to authenticated;
