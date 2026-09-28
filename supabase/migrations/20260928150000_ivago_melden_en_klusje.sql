-- =============================================================
-- IVAGO-afvalophaalkalender, Deel 2 + 3: geplande melding + optioneel
-- klusje.
--
-- ivago_klusje_aanmaken: optionele toggle per gezin (default uit) —
-- maakt bij een melding ook een onbeheerd "Afval buitenzetten"-klusje
-- aan voor de avond ervoor. "Onbeheerd" is bewust: het klusje wordt
-- nooit automatisch aan iemand toegewezen.
--
-- ivago-melden draait elk uur (UTC) via pg_cron/pg_net; de functie
-- zelf bepaalt via Intl of het lokaal (Europe/Brussels) 18u is, zodat
-- de melding correct blijft rond de zomer/winter-overgang zonder dat
-- de cron-expressie moet wisselen (valkuil 1). Dat maakt een extra of
-- verkeerde aanroep ook onschadelijk: buiten dat lokale uur is het een
-- goedkope no-op.
-- =============================================================

alter table public.gezinnen add column ivago_klusje_aanmaken boolean not null default false;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.unschedule('ivago-melden-elk-uur')
where exists (select 1 from cron.job where jobname = 'ivago-melden-elk-uur');

select cron.schedule(
  'ivago-melden-elk-uur',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://vkfszoqjpbnvokqkajfc.supabase.co/functions/v1/ivago-melden',
    headers := jsonb_build_object('content-type', 'application/json')
  );
  $$
);
