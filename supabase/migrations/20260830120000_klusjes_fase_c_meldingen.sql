-- =============================================================
-- Klusjes-uitbreiding, Fase C: in-app meldingen. Wanneer een klusje
-- aan een gezinslid wordt toegewezen (bij aanmaken of een latere
-- herindeling), krijgt die persoon een rij in meldingen — via een
-- database-trigger op klusjes, niet vanuit de client, zodat dit altijd
-- gebeurt ongeacht welk scherm de toewijzing doet. Dezelfde trigger is
-- de basis voor de pushmelding in Fase D.
--
-- Persoonlijk bezit: alleen de ontvanger ziet/beheert zijn eigen
-- meldingen (select/update), maar elk gezinslid mag een melding vóór
-- een ander gezinslid aanmaken (insert) — dat gebeurt nu eenmaal
-- wanneer je iemand anders een klusje toewijst.
-- =============================================================

create table public.meldingen (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  profiel_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  gelezen boolean not null default false,
  created_at timestamptz not null default now()
);

create index meldingen_profiel_id_idx on public.meldingen (profiel_id, created_at desc);

grant select, insert, update on public.meldingen to authenticated;
grant all on public.meldingen to service_role;
alter table public.meldingen enable row level security;

create policy "meldingen_select_eigen" on public.meldingen for select to authenticated
  using (profiel_id = auth.uid());

create policy "meldingen_insert_eigen_gezin" on public.meldingen for insert to authenticated
  with check (gezin_id = public.current_gezin_id());

create policy "meldingen_update_eigen" on public.meldingen for update to authenticated
  using (profiel_id = auth.uid())
  with check (profiel_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meldingen'
  ) then
    alter publication supabase_realtime add table public.meldingen;
  end if;
end $$;

create or replace function public.klusje_toewijzing_melden()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.toegewezen_aan is not null
     and new.toegewezen_aan is distinct from old.toegewezen_aan then
    insert into public.meldingen (gezin_id, profiel_id, type, payload)
    values (
      new.gezin_id,
      new.toegewezen_aan,
      'klusje_toegewezen',
      jsonb_build_object('klusje_id', new.id, 'titel', new.titel)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists klusjes_toewijzing_melden on public.klusjes;
create trigger klusjes_toewijzing_melden
  after insert or update of toegewezen_aan on public.klusjes
  for each row execute function public.klusje_toewijzing_melden();
