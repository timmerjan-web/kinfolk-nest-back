-- =============================================================
-- Fase 7 — Vandaag-dashboard: brengt weekmenu, klusjes, agenda en
-- verjaardagen van vandaag/binnen de marge samen, zoals de
-- placeholder-tekst uit Fase 1 al aankondigde. Verjaardagen hebben
-- één nieuwe kolom op profiles nodig — select loopt al via de
-- bestaande profiles_select_self_or_gezin-policy (gezinsleden zien
-- elkaars profielvelden), en update via profiles_update_own (elke
-- kolom behalve gezin_id/rol is al vrij door de eigenaar zelf te
-- wijzigen), dus geen nieuwe policies nodig.
-- =============================================================

alter table public.profiles add column geboortedatum date;
