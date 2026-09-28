# Plan: plusknoppen weer zichtbaar + bevestiging bij verwijderen klusje

## Oorzaak

De kopbalk van de app is bij de restyle licht geworden (`bg-card`), maar de ronde actieknoppen (plus/kruis) in de kop gebruiken nog steeds `bg-white/10 text-white` — witte tekst op een vrijwel doorzichtige witte achtergrond. Daardoor is de "nieuw klusje"-knop onzichtbaar. Dezelfde onzichtbare knop staat op 8 pagina's: klusjes, klus-sjablonen, agenda, weekmenu, weekstart, verjaardagen en verlanglijst.

Verwijderen van een klusje gebeurt nu direct zonder bevestiging (`verwijderen` in `src/routes/klusjes.tsx`).

## Wijzigingen

1. **Actieknoppen zichtbaar maken** — in alle 8 routebestanden de knopklassen `bg-white/10 text-white backdrop-blur` vervangen door semantische tokens die op de lichte kopbalk leesbaar zijn: `bg-primary/10 text-primary hover:bg-primary/20`. Zelfde stijl als de rest van het nieuwe ontwerp, geen nieuwe kleuren.

2. **Bevestiging bij verwijderen klusje** — in `src/routes/klusjes.tsx`:
   - De bestaande herbruikbare `BevestigDialog` (`src/components/bevestig-dialog.tsx`) gebruiken.
   - Klik op het prullenbakje opent de dialoog ("Klusje verwijderen?" met de titel van het klusje); pas bij "Verwijderen" wordt het klusje echt verwijderd. "Annuleren" en Escape sluiten zonder actie.

## Technische details

- Bestanden: `src/routes/klusjes.tsx`, `src/routes/klus-sjablonen.tsx`, `src/routes/agenda.tsx`, `src/routes/weekmenu.tsx`, `src/routes/weekstart.tsx`, `src/routes/verjaardagen.tsx`, `src/routes/verlanglijst.tsx` (alleen de knopklassen), plus de dialoog-toevoeging in `klusjes.tsx`.
- Geen database- of backend-wijzigingen.
- Verificatie: typecheck + build, en een visuele controle in de preview dat de plusknop zichtbaar is en de verwijderdialoog verschijnt.
