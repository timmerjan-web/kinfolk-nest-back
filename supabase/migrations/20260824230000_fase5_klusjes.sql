-- =============================================================
-- Fase 5 — Klusjes: eenmalige huishoudtaken met optionele deadline
-- en wie het doet. Geen herhaling/recurring templates in deze fase —
-- dat is bewust uitgesteld, net als "prikbord"/"agenda". Zelfde
-- collaboratieve gezin-scoping als recepten/weekmenu/boodschappen.
-- afgerond_door/afgerond_op houden bij wie het afvinkte en wanneer.
-- =============================================================

create table public.klusjes (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  titel text not null,
  deadline date,
  toegewezen_aan uuid references auth.users(id) on delete set null,
  afgerond boolean not null default false,
  afgerond_door uuid references auth.users(id) on delete set null,
  afgerond_op timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger klusjes_set_updated_at
  before update on public.klusjes
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.klusjes to authenticated;
grant all on public.klusjes to service_role;
alter table public.klusjes enable row level security;

create policy "klusjes_select_eigen_gezin" on public.klusjes for select to authenticated
  using (gezin_id = public.current_gezin_id());

create policy "klusjes_insert_eigen_gezin" on public.klusjes for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and created_by = auth.uid());

create policy "klusjes_update_eigen_gezin" on public.klusjes for update to authenticated
  using (gezin_id = public.current_gezin_id())
  with check (gezin_id = public.current_gezin_id());

create policy "klusjes_delete_eigen_gezin" on public.klusjes for delete to authenticated
  using (gezin_id = public.current_gezin_id());
