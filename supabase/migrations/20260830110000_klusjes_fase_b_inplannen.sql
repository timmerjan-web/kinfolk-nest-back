-- =============================================================
-- Klusjes-uitbreiding, Fase B: klusjes inplannen (uit de catalogus of
-- ad-hoc) en toewijzen, met voltooiingsgeschiedenis.
--
-- sjabloon_id: gevuld wanneer een klusje uit de catalogus is
-- ingepland, leeg bij een eenmalige ad-hoc taak.
-- herhaling: null = eenmalig; anders 'dagelijks'/'wekelijks'/
-- 'maandelijks' — bij afvinken wordt zo'n klusje dan niet blijvend
-- "afgerond", maar direct gereset met een nieuwe deadline (client-
-- side afgehandeld in lib/klusjes.ts, geen database-trigger nodig).
--
-- klus_voltooiingen logt elke afronding als los, onveranderlijk feit
-- (wie, welke klus, wanneer) i.p.v. alleen de laatste status op de
-- klusjes-rij te bewaren — nu bijna gratis, en de voorwaarde voor een
-- eventuele ranglijst later (Fase E). Zonder deze geschiedenis valt
-- achteraf niets te tellen. Append-only: geen update/delete-policy.
-- =============================================================

alter table public.klusjes
  add column sjabloon_id uuid references public.klus_sjablonen(id) on delete set null,
  add column herhaling text
    check (herhaling is null or herhaling in ('dagelijks', 'wekelijks', 'maandelijks'));

create table public.klus_voltooiingen (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  klusje_id uuid not null references public.klusjes(id) on delete cascade,
  sjabloon_id uuid references public.klus_sjablonen(id) on delete set null,
  toegewezen_aan uuid references auth.users(id) on delete set null,
  voltooid_op timestamptz not null default now()
);

create index klus_voltooiingen_klusje_id_idx on public.klus_voltooiingen (klusje_id);

grant select, insert on public.klus_voltooiingen to authenticated;
grant all on public.klus_voltooiingen to service_role;
alter table public.klus_voltooiingen enable row level security;

create policy "klus_voltooiingen_select_eigen_gezin" on public.klus_voltooiingen for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "klus_voltooiingen_insert_eigen_gezin" on public.klus_voltooiingen for insert to authenticated
  with check (gezin_id = public.current_gezin_id());
