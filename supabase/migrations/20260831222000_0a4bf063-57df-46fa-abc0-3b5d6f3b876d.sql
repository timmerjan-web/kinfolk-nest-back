create table public.push_abonnementen (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (endpoint)
);

grant select, insert, delete on public.push_abonnementen to authenticated;
grant all on public.push_abonnementen to service_role;
alter table public.push_abonnementen enable row level security;

create policy "push_abonnementen_select_eigen" on public.push_abonnementen for select to authenticated
  using (gebruiker_id = auth.uid());

create policy "push_abonnementen_insert_eigen" on public.push_abonnementen for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and gebruiker_id = auth.uid());

create policy "push_abonnementen_delete_eigen" on public.push_abonnementen for delete to authenticated
  using (gebruiker_id = auth.uid());