-- =============================================================
-- IVAGO-afvalophaalkalender, Deel 1: schema + lokale cache.
--
-- ivago_ronde: leeg = de hele functie is inactief (geen fouten, geen
-- meldingen) — zie ook de UI-tekst in Gezin-instellingen.
--
-- waste_collections is gedeelde, publieke referentiedata (IVAGO open
-- data), niet per gezin: meerdere gezinnen kunnen dezelfde ronde delen.
-- Alleen de service-role (de ivago-refresh Edge Function) mag hem
-- vullen; alle ingelogde gebruikers mogen lezen.
--
-- waste_calendar_status houdt bij wanneer de verversing voor het laatst
-- lukte/mislukte — voor de "laatst bijgewerkt"-waarschuwing in de UI
-- (valkuil 2: een wisselende dataset-id die ooit afloopt mag nooit
-- stilletjes stoppen met verversen).
-- =============================================================

alter table public.gezinnen add column ivago_ronde text;

create table public.waste_collections (
  id uuid primary key default gen_random_uuid(),
  ronde text not null,
  datum date not null,
  fracties text[] not null,
  bijgewerkt_op timestamptz not null default now(),
  gemeld_op timestamptz,
  unique (ronde, datum)
);

grant select on public.waste_collections to authenticated;
grant all on public.waste_collections to service_role;
alter table public.waste_collections enable row level security;

create policy "waste_collections_select_alle" on public.waste_collections
  for select to authenticated
  using (true);

create table public.waste_calendar_status (
  dataset_id text primary key,
  laatst_gelukt_op timestamptz,
  laatste_fout text,
  laatste_poging_op timestamptz not null default now()
);

grant select on public.waste_calendar_status to authenticated;
grant all on public.waste_calendar_status to service_role;
alter table public.waste_calendar_status enable row level security;

create policy "waste_calendar_status_select_alle" on public.waste_calendar_status
  for select to authenticated
  using (true);
