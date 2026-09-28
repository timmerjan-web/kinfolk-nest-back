-- =============================================================
-- UX-review, Deel 4/rechten: recepten verwijderen wordt beperkt tot
-- ouders — dit draait een eerdere keuze (CRUD open voor alle
-- gezinsleden) bewust om, op expliciet verzoek. Select/insert/update
-- blijven ongewijzigd (elk gezinslid mag nog toevoegen/bewerken).
-- =============================================================

alter policy "recepten_delete_eigen_gezin" on public.recepten
  using (gezin_id = public.current_gezin_id() and public.current_rol() = 'ouder');
