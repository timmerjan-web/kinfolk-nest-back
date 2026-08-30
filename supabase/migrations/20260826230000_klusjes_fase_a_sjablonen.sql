-- =============================================================
-- Klusjes-uitbreiding, Fase A: klus_sjablonen — vaste catalogus van
-- terugkerende klusjes waaruit in Fase B ingepland kan worden.
-- Alleen ouders beheren de catalogus (toevoegen/hernoemen/
-- verwijderen); alle gezinsleden mogen lezen (nodig om straks bij het
-- inplannen uit de catalogus te kiezen). Nieuwe gezinnen krijgen de
-- startcatalogus automatisch mee via gezin_aanmaken(); bestaande
-- gezinnen worden hieronder eenmalig geback-fild.
--
-- standaard_herhaling is puur een suggestie voor bij het inplannen in
-- Fase B — heeft in deze fase nog geen effect op de klusjes-tabel.
-- =============================================================

create table public.klus_sjablonen (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  titel text not null,
  icoon text not null default 'ListChecks',
  standaard_herhaling text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger klus_sjablonen_set_updated_at
  before update on public.klus_sjablonen
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.klus_sjablonen to authenticated;
grant all on public.klus_sjablonen to service_role;
alter table public.klus_sjablonen enable row level security;

create policy "klus_sjablonen_select_eigen_gezin" on public.klus_sjablonen for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "klus_sjablonen_insert_ouder" on public.klus_sjablonen for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and public.current_rol() = 'ouder');

create policy "klus_sjablonen_update_ouder" on public.klus_sjablonen for update to authenticated
  using (gezin_id = public.current_gezin_id() and public.current_rol() = 'ouder')
  with check (gezin_id = public.current_gezin_id() and public.current_rol() = 'ouder');

create policy "klus_sjablonen_delete_ouder" on public.klus_sjablonen for delete to authenticated
  using (gezin_id = public.current_gezin_id() and public.current_rol() = 'ouder');

-- Startcatalogus als herbruikbare functie, zodat zowel nieuwe
-- gezinnen (via gezin_aanmaken) als bestaande gezinnen (backfill
-- hieronder) dezelfde lijst krijgen.
create or replace function public.klus_sjablonen_seed(p_gezin_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.klus_sjablonen (gezin_id, titel, icoon) values
    (p_gezin_id, 'Vaatwas vullen', 'Utensils'),
    (p_gezin_id, 'Vaatwas legen', 'Utensils'),
    (p_gezin_id, 'Tafel dekken', 'UtensilsCrossed'),
    (p_gezin_id, 'Tafel afruimen', 'UtensilsCrossed'),
    (p_gezin_id, 'Was insteken', 'WashingMachine'),
    (p_gezin_id, 'Was uithalen', 'WashingMachine'),
    (p_gezin_id, 'Strijken', 'Shirt'),
    (p_gezin_id, 'Afval buitenzetten', 'Trash2'),
    (p_gezin_id, 'Koken', 'ChefHat');
$$;

revoke all on function public.klus_sjablonen_seed(uuid) from public, anon, authenticated;

create or replace function public.gezin_aanmaken(p_naam text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gezin_id uuid;
  v_huidig uuid;
begin
  select gezin_id into v_huidig from public.profiles where id = auth.uid();
  if v_huidig is not null then
    raise exception 'Je hoort al bij een gezin.';
  end if;
  if coalesce(trim(p_naam), '') = '' then
    raise exception 'Geef het gezin een naam.';
  end if;

  insert into public.gezinnen (naam) values (trim(p_naam)) returning id into v_gezin_id;
  update public.profiles set gezin_id = v_gezin_id, rol = 'ouder' where id = auth.uid();
  perform public.klus_sjablonen_seed(v_gezin_id);

  return v_gezin_id;
end;
$$;

-- Backfill voor gezinnen die al bestonden vóór deze migratie.
do $$
declare
  v_gezin record;
begin
  for v_gezin in select id from public.gezinnen loop
    if not exists (select 1 from public.klus_sjablonen where gezin_id = v_gezin.id) then
      perform public.klus_sjablonen_seed(v_gezin.id);
    end if;
  end loop;
end $$;
