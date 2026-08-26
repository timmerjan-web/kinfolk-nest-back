create or replace function public.heeft_eigen_foto_op(_datum date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dagelijkse_fotos
    where gebruiker_id = auth.uid() and datum = _datum
  )
$$;

revoke all on function public.heeft_eigen_foto_op(date) from public, anon;
grant execute on function public.heeft_eigen_foto_op(date) to authenticated;

drop policy if exists fotos_select_gated on public.dagelijkse_fotos;

create policy fotos_select_gated on public.dagelijkse_fotos
for select to authenticated
using (
  gezin_id = public.current_gezin_id()
  and (
    datum < current_date
    or gebruiker_id = auth.uid()
    or public.heeft_eigen_foto_op(datum)
  )
);