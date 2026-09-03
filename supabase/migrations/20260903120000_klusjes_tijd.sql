-- =============================================================
-- Klusjes: optioneel tijdstip naast de datum (bv. "vuilnis ophalen om
-- 08:00"). Puur informatief — telt niet mee in de "te laat"-check,
-- die blijft op dagniveau.
-- =============================================================

alter table public.klusjes add column if not exists deadline_tijd time;
