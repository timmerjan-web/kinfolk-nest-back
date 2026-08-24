-- =============================================================
-- Fase 6 — Agenda: gedeelde gezinsagenda. Eenvoudige afspraken met
-- datum, optioneel tijdstip en notitie — geen herhalende afspraken
-- of externe kalendersync in deze fase (dat komt in Fase 8, met een
-- aparte OAuth-consent-flow voor Calendar-schrijftoegang). Aankomend
-- vs. verleden wordt automatisch bepaald op datum, geen handmatige
-- afvink-status zoals bij klusjes. Zelfde collaboratieve
-- gezin-scoping als de andere Fase 2-5-tabellen.
-- =============================================================

create table public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  titel text not null,
  datum date not null,
  tijd time,
  notitie text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger agenda_items_set_updated_at
  before update on public.agenda_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.agenda_items to authenticated;
grant all on public.agenda_items to service_role;
alter table public.agenda_items enable row level security;

create policy "agenda_select_eigen_gezin" on public.agenda_items for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "agenda_insert_eigen_gezin" on public.agenda_items for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and created_by = auth.uid());

create policy "agenda_update_eigen_gezin" on public.agenda_items for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "agenda_delete_eigen_gezin" on public.agenda_items for delete to authenticated
  using (gezin_id = public.current_gezin_id());
