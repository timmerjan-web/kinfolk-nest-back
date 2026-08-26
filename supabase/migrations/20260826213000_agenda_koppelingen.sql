-- =============================================================
-- Agenda-koppelingen: elk gezinslid kan zijn eigen agenda (Google
-- Calendar, Outlook, Apple Kalender, ...) koppelen via de "geheime
-- iCal-URL" die die diensten zelf aanbieden — geen OAuth, geen
-- Google Cloud-project nodig.
--
-- De iCal-URL zelf is persoonlijk en gevoelig (bevat een privé-token
-- in de URL) — daarom is deze tabel strikt persoonlijk bezit, net als
-- dagelijkse_fotos: alleen de eigenaar mag zijn eigen rij zien/
-- beheren. Andere gezinsleden krijgen de rauwe URL nooit te zien,
-- alleen de opgehaalde afspraken via de agenda-ics-proxy Edge
-- Function (die met de service-role de links binnen hetzelfde gezin
-- opzoekt en alleen titel/tijden teruggeeft, nooit de url).
-- =============================================================

create table public.agenda_koppelingen (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  label text,
  ical_url text not null,
  created_at timestamptz not null default now(),
  unique (gebruiker_id, ical_url)
);

grant select, insert, delete on public.agenda_koppelingen to authenticated;
grant all on public.agenda_koppelingen to service_role;
alter table public.agenda_koppelingen enable row level security;

create policy "agenda_koppelingen_select_eigen" on public.agenda_koppelingen for select to authenticated
  using (gebruiker_id = auth.uid());

create policy "agenda_koppelingen_insert_eigen" on public.agenda_koppelingen for insert to authenticated
  with check (gebruiker_id = auth.uid() and gezin_id = public.current_gezin_id());

create policy "agenda_koppelingen_delete_eigen" on public.agenda_koppelingen for delete to authenticated
  using (gebruiker_id = auth.uid());
