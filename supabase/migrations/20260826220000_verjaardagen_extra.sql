-- =============================================================
-- Verjaardagenkalender voor vrienden & familie buiten het gezin
-- (opa's/oma's, vrienden, ...) — een gedeelde gezinsresource, net als
-- recepten/klusjes/agenda/prikbord: elk gezinslid mag toevoegen/
-- bewerken/verwijderen.
--
-- geboortedatum bewaart altijd jaar 2000 (een schrikkeljaar, dus ook
-- 29 februari kan) — alleen maand/dag zijn relevant. Het échte
-- geboortejaar is optioneel en staat apart in geboortejaar, puur voor
-- leeftijdsweergave. Dit hergebruikt dezelfde maand/dag-conventie en
-- dezelfde dagenTotVerjaardag()/formatteerVerjaardag()-helpers als
-- profiles.geboortedatum (gezinsleden zelf).
-- =============================================================

create table public.verjaardagen (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  naam text not null,
  geboortedatum date not null,
  geboortejaar integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger verjaardagen_set_updated_at
  before update on public.verjaardagen
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.verjaardagen to authenticated;
grant all on public.verjaardagen to service_role;
alter table public.verjaardagen enable row level security;

create policy "verjaardagen_select_eigen_gezin" on public.verjaardagen for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "verjaardagen_insert_eigen_gezin" on public.verjaardagen for insert to authenticated
  with check (gezin_id = public.current_gezin_id());

create policy "verjaardagen_update_eigen_gezin" on public.verjaardagen for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "verjaardagen_delete_eigen_gezin" on public.verjaardagen for delete to authenticated
  using (gezin_id = public.current_gezin_id());
