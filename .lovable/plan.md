# Agenda: verkeerde tijden bij herhalende afspraken herstellen

## Wat er misgaat

In de laatste antwoorden van de agenda-koppeling staan de herhalingen van "Marijke zwemmen" telkens op het exacte tijdstip waarop de pagina geladen werd (bijv. start 21:20:46 toen de pagina om 21:20:46 laadde, en 21:21:04 bij de volgende lading). Het tijdstip van de afspraak zelf wordt dus genegeerd.

Oorzaak: bij de laatste snelheidsoptimalisatie start de herhalingsberekening bij "gisteren, nu" in plaats van bij de echte startdatum/-tijd van de afspraak. De agendabibliotheek neemt dat meegegeven moment over als begintijd van de serie, waardoor elke herhaling het huidige klokuur krijgt. Datzelfde verklaart ook dat dezelfde agenda soms 8 afspraken en soms 0 afspraken teruggeeft.

## De oplossing

1. Nooit meer een willekeurig moment als serie-start meegeven. De herhalingen worden weer vanaf de echte startdatum van de afspraak berekend, zodat tijdstip en dag exact kloppen.
2. Om toch snel te blijven (dat was de reden van de vorige aanpassing): vooraf uitrekenen hoeveel volledige herhalingsperiodes overgeslagen kunnen worden bij eenvoudige dagelijkse/wekelijkse series, en de serie op die exacte, echte herhaling laten starten. Maandelijkse/jaarlijkse series zijn goedkoop en lopen gewoon vanaf het begin.
3. Bestaande veiligheidsgrenzen (max. iteraties, max. afspraken, max. bestandsgrootte, tijdsbudget) blijven staan, zodat de functie niet opnieuw tegen de rekentijdlimiet aanloopt.
4. Na aanpassing opnieuw uitrollen en de agenda controleren: de zwemafspraak moet elke week op hetzelfde, correcte uur staan, en het aantal afspraken moet bij elke lading gelijk blijven.

## Technische details

- Bestand: `supabase/functions/agenda-ics-proxy/index.ts`
- `event.iterator(ICAL.Time.fromJSDate(...))` vervangen door een iterator die start op een berekende, echte occurrence (`dtstart` + n × interval voor `FREQ=DAILY`/`WEEKLY`), anders `event.iterator()` zonder argument.
- Goedkope voorfilter op `next.toJSDate()` vóór `getOccurrenceDetails` blijft behouden.
- Alleen deze Edge Function wijzigt; geen database- of frontendwijzigingen.
