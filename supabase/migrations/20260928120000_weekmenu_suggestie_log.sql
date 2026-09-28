-- =============================================================
-- Weekstart, Deel 2 — AI-menusuggestie: eenvoudige rem tegen misbruik/
-- vastlopende knop. Logt elke aanvraag (vóór de Claude-call, dus ook
-- mislukte pogingen tellen mee — simpelste correcte gedrag). De
-- Edge Function telt zelf hoeveel rijen er vandaag al voor dit gezin
-- staan en weigert boven de limiet. Insert-only: geen update/delete
-- nodig voor een logtabel.
-- =============================================================

create table public.weekmenu_suggestie_log (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  aangevraagd_door uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert on public.weekmenu_suggestie_log to authenticated;
grant all on public.weekmenu_suggestie_log to service_role;
alter table public.weekmenu_suggestie_log enable row level security;

create policy "weekmenu_suggestie_log_select_eigen_gezin" on public.weekmenu_suggestie_log
  for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "weekmenu_suggestie_log_insert_eigen_gezin" on public.weekmenu_suggestie_log
  for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and aangevraagd_door = auth.uid());
