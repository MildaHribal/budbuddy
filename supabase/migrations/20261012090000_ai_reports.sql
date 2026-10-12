-- Reports on AI assistant answers (Google Play generative-AI policy).
-- target_type 'ai', target_id = the chat message id (lives only on the device), the reported
-- question/answer in meta. Signed-in users insert their own; signed-out reports come from the
-- report-ai Netlify function (service role) with reporter_id null.

alter table public.reports alter column reporter_id drop not null;
alter table public.reports add column if not exists meta jsonb;

alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'tip', 'profile', 'plant', 'strain', 'entry', 'ai'));

alter table public.reports drop constraint reports_reason_check;
alter table public.reports add constraint reports_reason_check check (
  case when target_type = 'ai' then reason in ('offensive', 'dangerous', 'wrong', 'other')
       else reason in ('spam', 'sale', 'abuse', 'nsfw', 'minor', 'personal', 'other') end);

-- only AI reports may be anonymous or carry meta, and meta stays small
alter table public.reports add constraint reports_reporter_check check (reporter_id is not null or target_type = 'ai');
alter table public.reports add constraint reports_meta_check check (
  meta is null or (target_type = 'ai' and jsonb_typeof(meta) = 'object' and pg_column_size(meta) <= 8000));

-- AI reports need a signed-in, non-banned account but not the community terms
alter policy "own reports" on public.reports with check (
  reporter_id = auth.uid() and (
    private.can_post()
    or (target_type = 'ai' and exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_banned))));

-- global brake on anonymous reports (the function also rate-limits per IP)
create or replace function private.anon_report_brake() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reporter_id is null and (
    select count(*) from public.reports where reporter_id is null and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'rate limit: too many anonymous reports' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function private.anon_report_brake() from public, anon, authenticated;
create trigger reports_anon_brake before insert on public.reports for each row execute function private.anon_report_brake();

create index if not exists reports_ai_open on public.reports (created_at desc) where target_type = 'ai' and status = 'open';
