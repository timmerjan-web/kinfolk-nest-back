# Ophaalkalender rechtzetten met het IVAGO-agendabestand

## Wat er misloopt
De app neemt de open databank van Stad Gent exact over, maar die databank klopt zelf niet met de IVAGO-website. Een voorbeeld: in de databank staat 8 okt voor GFT, papier en PMD, terwijl IVAGO 5 okt aangeeft. Ook ontbreken 12 okt, 2 nov en 9 nov. Het agendabestand dat je doorstuurde komt wel overeen met je schermafbeeldingen.

## Oplossing
1. **Kalender vervangen door jouw bestand.** De oude ophaaldagen van ronde C1A worden gewist. Daarna laad ik de datums uit het bestand in: GFT, papier, PMD, restafval en kerstbomen, van 7 september 2026 tot 31 maart 2027. Grofvuil laat ik weg, zoals nu.
2. **Automatisch vernieuwen stopzetten** voor jullie gezin. Anders overschrijft de open databank de juiste datums opnieuw.
3. **Controle achteraf:** de komende datums voor oktober en november naast je schermafbeeldingen leggen.

## Na 31 maart 2027
Het bestand loopt tot en met 31 maart 2027. Voor daarna zijn er twee mogelijkheden:
- Je downloadt dan het nieuwe bestand en stuurt het door, net zoals nu.
- Of je stuurt de sync-link achter de knop "SYNC" op ivago.be door. Dan kan ik de kalender voortaan automatisch uit die link laten vullen.

## Technische details
- Het bestand wordt geparsed via DTSTART (VALUE=DATE) en SUMMARY en daarna gegroepeerd per datum. De fracties worden in kleine letters opgeslagen, grofvuil wordt eruit gefilterd.
- Het vervangen gebeurt via run_sql op `waste_collections` (ronde C1A): eerst een DELETE vanaf 2026-09-07, daarna een INSERT met de gegroepeerde rijen.
- Het automatisch vernieuwen voor C1A wordt uitgeschakeld in `ivago-refresh`, met een lijst van rondes die overgeslagen worden. `ivago-melden` blijft ongewijzigd.
