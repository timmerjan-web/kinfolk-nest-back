-- =============================================================
-- Recepten krijgen het Corsica26-model: categorie, tags, recept-URL,
-- ingrediënten en bereidingsstappen weer als vrije tekstregels
-- (text[]) i.p.v. de gestructureerde hoeveelheid/eenheid-vorm uit
-- migratie 19 — bewuste terugdraai, zie sessieoverleg: vrije tekst
-- maakt bulk-invoer van ~50 recepten haalbaar, schalen laten we los.
-- Plus een nieuwe tabel voor privé-favorieten per gezinslid.
--
-- Elke stap is guard-idempotent op het huidige kolomtype/bestaan,
-- zodat dit veilig herhaald kan worden als handmatige toepassing
-- nodig is omdat de migratie niet vanzelf doorkwam.
-- =============================================================

-- 1) ingredienten: jsonb -> text[] (samengevoegd tot "hoeveelheid eenheid naam")
do $$
begin
  if (
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'recepten' and column_name = 'ingredienten'
  ) = 'jsonb' then
    alter table public.recepten alter column ingredienten drop default;
    alter table public.recepten alter column ingredienten type text[] using (
      coalesce(
        (
          select array_agg(
            trim(concat_ws(' ', elem->>'hoeveelheid', elem->>'eenheid', elem->>'naam'))
          )
          from jsonb_array_elements(ingredienten) as elem
        ),
        '{}'::text[]
      )
    );
    alter table public.recepten alter column ingredienten set default '{}'::text[];
    alter table public.recepten alter column ingredienten set not null;
  end if;
end $$;

-- 2) instructies (vrije tekstblob) -> stappen (text[], één stap per regel)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recepten' and column_name = 'stappen'
  ) then
    alter table public.recepten add column stappen text[] not null default '{}';
    update public.recepten set stappen = (
      select coalesce(array_agg(stap), '{}'::text[])
      from (
        select trim(regexp_replace(regel, '^\s*\d+[\.\)]\s*', '')) as stap
        from unnest(regexp_split_to_array(coalesce(instructies, ''), E'\r?\n+')) as regel
      ) t
      where stap <> ''
    ) where instructies is not null and trim(instructies) <> '';
    alter table public.recepten drop column instructies;
  end if;
end $$;

-- 3) categorie (vrije tekst, geen enum — makkelijk uitbreidbaar zonder migratie)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recepten' and column_name = 'categorie'
  ) then
    alter table public.recepten add column categorie text not null default 'maaltijd';
  end if;
end $$;

-- 4) tags
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recepten' and column_name = 'tags'
  ) then
    alter table public.recepten add column tags text[] not null default '{}';
  end if;
end $$;

-- 5) link naar origineel recept
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recepten' and column_name = 'recept_url'
  ) then
    alter table public.recepten add column recept_url text;
  end if;
end $$;

-- 6) Favorieten — privé per gezinslid (niet zichtbaar voor de rest van het
-- gezin), vandaar de select-policy op gebruiker_id = auth.uid() i.p.v. het
-- gebruikelijke gezin-brede leespatroon.
create table if not exists public.recept_favorieten (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  recept_id uuid not null references public.recepten(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recept_id, gebruiker_id)
);

grant select, insert, delete on public.recept_favorieten to authenticated;
grant all on public.recept_favorieten to service_role;
alter table public.recept_favorieten enable row level security;

drop policy if exists "receptfavorieten_select_eigen" on public.recept_favorieten;
create policy "receptfavorieten_select_eigen" on public.recept_favorieten for select to authenticated
  using (gebruiker_id = auth.uid());

drop policy if exists "receptfavorieten_insert_eigen" on public.recept_favorieten;
create policy "receptfavorieten_insert_eigen" on public.recept_favorieten for insert to authenticated
  with check (gebruiker_id = auth.uid() and gezin_id = public.current_gezin_id());

drop policy if exists "receptfavorieten_delete_eigen" on public.recept_favorieten;
create policy "receptfavorieten_delete_eigen" on public.recept_favorieten for delete to authenticated
  using (gebruiker_id = auth.uid());
