# Ophaalkalender rechtzetten

## Wat er misloopt
De app neemt de data van de open databank van Stad Gent exact over. Maar die databank klopt zelf niet met de IVAGO-website. Voor de Zilverberklaan staan er fouten in, bijvoorbeeld:

| IVAGO-website | Open databank (en dus de app) |
|---|---|
| ma 5 okt: GFT, papier, PMD | do 8 okt: GFT, papier, PMD |
| ma 12 okt: restafval | ontbreekt |
| ma 2 nov: GFT, papier, PMD | ontbreekt |
| ma 9 nov: restafval | do 5 nov: restafval |

19, 23 en 26 okt en 16, 23 en 30 nov kloppen wel. De ronde C1A is dus juist, maar de databank bevat verkeerde datums. Een andere instelling in de app lost dit niet op.

## Oplossing
De gegevens niet meer uit de open databank halen, maar uit IVAGO zelf: de agenda-link achter de knop **"SYNC Google / Outlook / Apple"** op ivago.be. Die komt overeen met wat jij op de site ziet.

1. Jij kopieert die sync-link (voor Zilverberklaan 80) en plakt ze hier in de chat.
2. Ik pas het vernieuwen van de kalender aan zodat het die agenda leest: per dag de fracties (GFT, papier, PMD, restafval, glas). Grofvuil blijft eruit, zoals nu.
3. De link wordt bewaard bij je gezin, zodat de kalender automatisch vernieuwd blijft.
4. Kalender opnieuw vullen en de komende datums naast jouw schermafbeeldingen leggen voor oktober en november.

## Technische details
- Nieuwe kolom `gezinnen.ivago_ical_url` (migratie). `waste_collections` wordt dan per gezin gevuld, niet meer per ronde. Alternatief: rondecode behouden en de iCal gebruiken als bron voor C1A.
- `ivago-refresh`: iCal parsen (VEVENT SUMMARY → fracties, DTSTART → datum), met hergebruik van de parser-aanpak uit `agenda-ics-proxy`. Daarna upsert in `waste_collections`.
- `ivago-melden` blijft ongewijzigd lezen uit `waste_collections`.
