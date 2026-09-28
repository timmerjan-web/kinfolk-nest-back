-- =============================================================
-- Kijk- & leeslijst: persoonlijke lijstjes (films/series om te
-- kijken, boeken om te lezen), gezinsbreed zichtbaar. Bewust simpel
-- gehouden — één tabel met een "soort"-kolom i.p.v. aparte tabellen
-- per lijstsoort, zodat een derde soort later gewoon een nieuwe
-- waarde is. Geen gedeeltelijk delen (bv. "alleen met deze 2
-- personen") — dat is expliciet uitgesteld tot het echt nodig blijkt.
--
-- Zelfde patroon als verlanglijst_items: gebruiker_id = van wie het
-- lijstje is (persoonlijk bezit qua toevoegen/verwijderen), maar
-- "afgerond" afvinken mag elk gezinslid.
-- =============================================================

create table public.lijst_items (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  soort text not null check (soort in ('kijken', 'lezen')),
  titel text not null,
  notitie text,
  afgerond boolean not null default false,
  afgerond_door uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.lijst_items to authenticated;
grant all on public.lijst_items to service_role;
alter table public.lijst_items enable row level security;

create policy "lijst_items_select_eigen_gezin" on public.lijst_items for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "lijst_items_insert_eigen" on public.lijst_items for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and gebruiker_id = auth.uid());

create policy "lijst_items_update_eigen_gezin" on public.lijst_items for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "lijst_items_delete_eigenaar_of_ouder" on public.lijst_items for delete to authenticated
  using (
    gezin_id = public.current_gezin_id()
    and (gebruiker_id = auth.uid() or public.current_rol() = 'ouder')
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lijst_items'
  ) then
    alter publication supabase_realtime add table public.lijst_items;
  end if;
end $$;
