# Fix: "[object Object]" bij gezin aanmaken + ontbrekende receptentabel

## Wat er gebeurt

Bevestigd via de logs, de code en de database:

1. **De foutmelding.** Jouw account hoort al bij een gezin, dus de backend weigert `gezin_aanmaken` terecht met "Je hoort al bij een gezin.". Die nette tekst wordt alleen niet getoond: databasefouten zijn geen JavaScript-`Error`, en de onboardingpagina valt dan terug op `String(err)` — dat geeft letterlijk `[object Object]`.
2. **Je hoort daar niet meer te zijn.** Met een gezin in je profiel zou onboarding je meteen moeten doorsturen in plaats van een formulier te tonen dat altijd faalt.
3. **De app bouwt momenteel niet.** De tabel `recepten` bestaat wél als migratiebestand in het project, maar staat niet in de database. Daardoor kent de gegenereerde typedefinitie die tabel niet en geven alle receptenpagina's typefouten.

## Wat ik ga doen

**Recepten-backend herstellen (eerst)**
- De bestaande migratie voor `recepten` alsnog uitvoeren, byte-voor-byte zoals ze in het project staat (tabel, GRANTs, RLS per gezin, updated_at-trigger). Daarna worden de types opnieuw gegenereerd en verdwijnen de bouwfouten.

**Foutmeldingen leesbaar maken**
- Eén gedeelde hulpfunctie die van elke fout (databasefout, `Error`, of iets anders) een leesbare tekst maakt, met een zinnige fallback.
- Die overal toepassen waar nu een melding getoond wordt: onboarding, inloggen, gezin, recepten. Zo verdwijnt `[object Object]` in de hele app.

**Onboarding-doorverwijzing**
- Heeft je profiel al een gezin, dan meteen doorsturen naar de startpagina.

**Kleine typefout**
- `subtitle` in `gezin.tsx` mag optioneel `undefined` zijn.

## Technisch

- Migratie: inhoud van `supabase/migrations/20260824190000_fase2_recepten.sql` ongewijzigd aanbieden via de migratietool.
- Nieuwe helper `src/lib/errors.ts`: leest `message` van `Error` en van Postgrest-achtige objecten (`{ message, code, details, hint }`), anders de fallbacktekst.
- Vervang de `err instanceof Error ? err.message : String(err)`-patronen in `src/routes/onboarding.tsx`, `src/routes/auth.tsx`, `src/routes/gezin.tsx`, `src/routes/recepten/*`.
- `src/routes/onboarding.tsx`: bij `profile?.gezin_id` een `<Navigate to="/" replace />`.
- `src/components/app-shell.tsx`: `subtitle?: string | undefined` (project draait met `exactOptionalPropertyTypes`).
