-- =============================================================
-- Fase 4 — Boodschappen: gedeelde boodschappenlijst. Items komen
-- ofwel handmatig binnen, of worden gegenereerd uit de ingrediënten
-- van het weekmenu (Fase 3) — bron_recept_id houdt bij welk recept
-- een item opleverde, zodat "genereer van weekmenu" niet dubbel
-- toevoegt bij een herhaalde klik. Zelfde collaboratieve
-- gezin-scoping als recepten/weekmenu.
-- =============================================================

create table public.boodschappen_items (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  naam text not null,
  afgevinkt boolean not null default false,
  bron_recept_id uuid references public.recepten(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger boodschappen_items_set_updated_at
  before update on public.boodschappen_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.boodschappen_items to authenticated;
grant all on public.boodschappen_items to service_role;
alter table public.boodschappen_items enable row level security;

create policy "boodschappen_select_eigen_gezin" on public.boodschappen_items for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "boodschappen_insert_eigen_gezin" on public.boodschappen_items for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and created_by = auth.uid());

create policy "boodschappen_update_eigen_gezin" on public.boodschappen_items for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "boodschappen_delete_eigen_gezin" on public.boodschappen_items for delete to authenticated
  using (gezin_id = public.current_gezin_id());
