-- =============================================================
-- Fase 2 — Recepten: het gezinskookboek. Elk gezinslid (ouder of
-- kind) kan recepten toevoegen, bewerken en verwijderen — het is
-- een gedeeld kookboek, geen per-gebruiker eigendom. Scoping loopt
-- via gezin_id = current_gezin_id(), hetzelfde patroon als de
-- Fase 1-tabellen.
-- =============================================================

create table public.recepten (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  titel text not null,
  beschrijving text,
  bereidingstijd_minuten integer,
  porties integer,
  ingredienten text[] not null default '{}',
  instructies text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recepten_set_updated_at
  before update on public.recepten
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.recepten to authenticated;
grant all on public.recepten to service_role;
alter table public.recepten enable row level security;

create policy "recepten_select_eigen_gezin" on public.recepten for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "recepten_insert_eigen_gezin" on public.recepten for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and created_by = auth.uid());

create policy "recepten_update_eigen_gezin" on public.recepten for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "recepten_delete_eigen_gezin" on public.recepten for delete to authenticated
  using (gezin_id = public.current_gezin_id());