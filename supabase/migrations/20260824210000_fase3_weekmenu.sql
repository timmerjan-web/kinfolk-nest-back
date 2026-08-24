-- =============================================================
-- Fase 3 — Weekmenu: koppel een maaltijd aan een dag, optioneel
-- gelinkt aan een recept uit het kookboek (Fase 2), plus wie kookt.
-- Titel is altijd een eigen snapshot-tekst (ook als recept_id later
-- verdwijnt blijft de titel leesbaar). Zelfde collaboratieve
-- gezin-scoping als recepten: elk gezinslid kan elke dag invullen,
-- bewerken en verwijderen.
-- =============================================================

create table public.weekmenu_items (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  datum date not null,
  recept_id uuid references public.recepten(id) on delete set null,
  titel text not null,
  kok uuid references auth.users(id) on delete set null,
  notitie text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gezin_id, datum)
);

create trigger weekmenu_items_set_updated_at
  before update on public.weekmenu_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.weekmenu_items to authenticated;
grant all on public.weekmenu_items to service_role;
alter table public.weekmenu_items enable row level security;

create policy "weekmenu_select_eigen_gezin" on public.weekmenu_items for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "weekmenu_insert_eigen_gezin" on public.weekmenu_items for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and created_by = auth.uid());

create policy "weekmenu_update_eigen_gezin" on public.weekmenu_items for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "weekmenu_delete_eigen_gezin" on public.weekmenu_items for delete to authenticated
  using (gezin_id = public.current_gezin_id());
