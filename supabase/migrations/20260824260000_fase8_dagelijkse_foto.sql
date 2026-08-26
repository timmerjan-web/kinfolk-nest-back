-- =============================================================
-- Fase 8 — Dagelijkse foto: elke dag één foto per gezinslid, in een
-- private Storage-bucket. "Post to see"-mechaniek (BeReal-stijl):
-- de foto's van vandaag van ándere gezinsleden zijn pas zichtbaar
-- zodra je zelf ook vandaag hebt geplaatst — afgedwongen in de
-- SELECT-policy zelf (niet alleen in de UI), via een subquery die
-- checkt of de aanroeper vandaag al een eigen rij heeft. Oudere
-- dagen zijn altijd zichtbaar (het wordt een fotodagboek, geen
-- wedstrijd om alles geheim te houden).
--
-- Afwijkend van de andere Fase 2-7-tabellen: een foto is persoonlijk
-- bezit (je eigen selfie van de dag), geen gedeelde gezinsresource —
-- daarom mag alleen de plaatser zelf zijn eigen rij bewerken/
-- verwijderen, in tegenstelling tot bv. recepten/klusjes waar elk
-- gezinslid alles mag aanpassen.
--
-- Storage-RLS is alleen gezin-gescoped (via het pad-prefix
-- gezin_id/gebruiker_id/...), niet dezelfde day-gating als de
-- tabel — dat is bewust: paden zijn alleen te raden door iemand die
-- al in hetzelfde gezin zit, en dit is een leuk gezinsfeature, geen
-- beveiligingskritiek systeem.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('dagelijkse-fotos', 'dagelijkse-fotos', false)
on conflict (id) do nothing;

create table public.dagelijkse_fotos (
  id uuid primary key default gen_random_uuid(),
  gezin_id uuid not null references public.gezinnen(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  datum date not null,
  storage_pad text not null,
  bijschrift text,
  created_at timestamptz not null default now(),
  unique (gebruiker_id, datum)
);

grant select, insert, update, delete on public.dagelijkse_fotos to authenticated;
grant all on public.dagelijkse_fotos to service_role;
alter table public.dagelijkse_fotos enable row level security;

create policy "fotos_select_gated" on public.dagelijkse_fotos for select to authenticated
  using (
    gezin_id = public.current_gezin_id()
    and (
      datum < current_date
      or gebruiker_id = auth.uid()
      or exists (
        select 1 from public.dagelijkse_fotos eigen
        where eigen.gebruiker_id = auth.uid() and eigen.datum = dagelijkse_fotos.datum
      )
    )
  );

create policy "fotos_insert_eigen" on public.dagelijkse_fotos for insert to authenticated
  with check (gezin_id = public.current_gezin_id() and gebruiker_id = auth.uid());

create policy "fotos_update_eigen" on public.dagelijkse_fotos for update to authenticated
  using (gebruiker_id = auth.uid())
  with check (gebruiker_id = auth.uid() and gezin_id = public.current_gezin_id());

create policy "fotos_delete_eigen" on public.dagelijkse_fotos for delete to authenticated
  using (gebruiker_id = auth.uid());

create policy "dagelijkse_fotos_storage_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'dagelijkse-fotos'
    and (storage.foldername(name))[1] = public.current_gezin_id()::text
  );

create policy "dagelijkse_fotos_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dagelijkse-fotos'
    and (storage.foldername(name))[1] = public.current_gezin_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "dagelijkse_fotos_storage_update" on storage.objects for update to authenticated
  using (bucket_id = 'dagelijkse-fotos' and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'dagelijkse-fotos' and (storage.foldername(name))[2] = auth.uid()::text);

create policy "dagelijkse_fotos_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'dagelijkse-fotos' and (storage.foldername(name))[2] = auth.uid()::text);
