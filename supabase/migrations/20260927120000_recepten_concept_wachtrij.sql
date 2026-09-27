-- =============================================================
-- Recepten: concept-wachtrij voor "delen vanuit Instagram". Een
-- gedeelde post/reel komt eerst binnen als status='concept' (bron,
-- bron_url, ruwe_tekst erbij), pas na nakijken + "Publiceren" wordt
-- het een normaal, zichtbaar recept (status='definitief').
--
-- Puur additief: bestaande recepten krijgen via de default
-- status='definitief' en blijven ongewijzigd zichtbaar. Geen enkele
-- bestaande kolom wordt aangepast of verwijderd.
-- =============================================================

alter table public.recepten
  add column if not exists status text not null default 'definitief',
  add column if not exists bron text,
  add column if not exists bron_url text,
  add column if not exists ruwe_tekst text,
  add column if not exists toegevoegd_op timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'recepten_status_check'
  ) then
    alter table public.recepten
      add constraint recepten_status_check check (status in ('concept', 'definitief'));
  end if;
end $$;
