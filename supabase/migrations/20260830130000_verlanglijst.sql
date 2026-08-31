-- =============================================================
-- Verlanglijst: cadeau-ideeën per gezinslid. Bewust simpel — geen
-- verborgen reserveringen, geen gelegenheden. Iedereen ziet elkaars
-- lijstje volledig, inclusief wie iets als gekocht heeft afgevinkt
-- (ook zichtbaar voor de eigenaar van de wens — geen verrassing).
--
-- Persoonlijk bezit qua toevoegen/verwijderen (zelfde patroon als
-- dagelijkse_fotos: gebruiker_id = wie de wens is), maar afvinken
-- ("gekocht") is een gedeelde actie die elk gezinslid mag doen. Naast
-- de eigenaar mogen ook ouders verwijderen (bv. om de lijst netjes te
-- houden na een verjaardag).
-- =============================================================

create table public.verlanglijst_items (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  titel text not null,
  url text,
  prijs numeric,
  notitie text,
  gekocht boolean not null default false,
  gekocht_door uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.verlanglijst_items to authenticated;
grant all on public.verlanglijst_items to service_role;
alter table public.verlanglijst_items enable row level security;

create policy "verlanglijst_select_eigen_gezin" on public.verlanglijst_items for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "verlanglijst_insert_eigen" on public.verlanglijst_items for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and gebruiker_id = auth.uid());

create policy "verlanglijst_update_eigen_gezin" on public.verlanglijst_items for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "verlanglijst_delete_eigenaar_of_ouder" on public.verlanglijst_items for delete to authenticated
  using (
    gezin_id = public.current_gezin_id()
    and (gebruiker_id = auth.uid() or public.current_rol() = 'ouder')
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'verlanglijst_items'
  ) then
    alter publication supabase_realtime add table public.verlanglijst_items;
  end if;
end $$;
