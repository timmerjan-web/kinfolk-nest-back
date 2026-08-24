# Fix: "[object Object]" bij gezin aanmaken

## Wat er gebeurt

Twee dingen tegelijk, allebei bevestigd in de logs en de code:

1. De backend weigert de actie terecht: jouw account hoort al bij een gezin, dus de aanroep `gezin_aanmaken` geeft "Je hoort al bij een gezin." terug (foutcode P0001, zichtbaar in de netwerkaanvragen).
2. Die nette Nederlandse melding wordt niet getoond. De foutobjecten van de database zijn geen JavaScript `Error`, en de onboarding-pagina valt dan terug op `String(err)` — dat levert letterlijk `[object Object]` op.

Daarnaast: omdat je al een gezin hebt, hoor je helemaal niet meer op de onboardingpagina te landen.

## Wat ik ga doen

- Eén gedeelde hulpfunctie die van elke fout (database-fout, `Error`, of iets anders) een leesbare tekst maakt, met een zinnige fallback.
- Die hulpfunctie gebruiken op alle plekken waar nu een foutmelding getoond wordt: onboarding, inloggen, gezin, recepten. Zo verdwijnt `[object Object]` overal.
- Onboarding stuurt je automatisch door naar de startpagina zodra je profiel al een gezin heeft, in plaats van een formulier te tonen dat gegarandeerd faalt.

## Technisch

- Nieuwe helper in `src/lib/errors.ts`: leest `message` van `Error` en van Postgrest-achtige objecten (`{ message, code, details, hint }`), anders de meegegeven fallbacktekst.
- Vervang de `err instanceof Error ? err.message : String(err)`-patronen in `src/routes/onboarding.tsx`, `src/routes/auth.tsx`, `src/routes/gezin.tsx`, `src/routes/recepten/*` door die helper.
- In `src/routes/onboarding.tsx`: als `profile?.gezin_id` bestaat, `<Navigate to="/" replace />` renderen.

Geen databasewijzigingen nodig; het schema en de RLS blijven ongewijzigd.
