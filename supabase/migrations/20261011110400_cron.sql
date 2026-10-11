-- Scheduled jobs: hourly "mark as solved" nudge, daily badges + rate-log cleanup.
create extension if not exists pg_cron with schema extensions;

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('budbuddy-ping-unsolved', 'budbuddy-daily');
  perform cron.schedule('budbuddy-ping-unsolved', '17 * * * *', 'select public.ping_unsolved()');
  perform cron.schedule('budbuddy-daily', '23 3 * * *', 'select private.daily_maintenance()');
end $$;
