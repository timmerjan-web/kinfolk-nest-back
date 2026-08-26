-- =============================================================
-- Fase 9 — Prikbord: vrije, korte berichten met optionele losse tags
-- en een optionele foto. Bewust géén vaste categorieën — tags zijn
-- vrije tekst zodat plaatsen laagdrempelig blijft. Vastpinnen houdt
-- belangrijke berichten bovenaan.
--
-- Anders dan dagelijkse_fotos (Fase 8, persoonlijk bezit): een
-- prikbord-bericht is een gedeelde gezinsresource, zelfde
-- collaboratieve RLS-patroon als recepten/klusjes/agenda — elk
-- gezinslid mag alles aanpassen/verwijderen/vastpinnen, niet alleen
-- de plaatser.
--
-- storage_pad wordt vooraf client-side bepaald met een zelf
-- gegenereerde uuid (zie lib/prikbord.ts) zodat de foto-upload en de
-- rij-insert niet op elkaar hoeven te wachten.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('prikbord-fotos', 'prikbord-fotos', false)
on conflict (id) do nothing;

create table public.prikbord_items (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  tekst text not null,
  tags text[] not null default '{}',
  storage_pad text,
  vastgepind boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger prikbord_items_set_updated_at
  before update on public.prikbord_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.prikbord_items to authenticated;
grant all on public.prikbord_items to service_role;
alter table public.prikbord_items enable row level security;

create policy "prikbord_select_eigen_gezin" on public.prikbord_items for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "prikbord_insert_eigen_gezin" on public.prikbord_items for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and created_by = auth.uid());

create policy "prikbord_update_eigen_gezin" on public.prikbord_items for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "prikbord_delete_eigen_gezin" on public.prikbord_items for delete to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "prikbord_storage_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'prikbord-fotos'
    and (storage.foldername(name))[1] = public.current_gezin_id()::text
  );

create policy "prikbord_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prikbord-fotos'
    and (storage.foldername(name))[1] = public.current_gezin_id()::text
  );

create policy "prikbord_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'prikbord-fotos'
    and (storage.foldername(name))[1] = public.current_gezin_id()::text
  );
