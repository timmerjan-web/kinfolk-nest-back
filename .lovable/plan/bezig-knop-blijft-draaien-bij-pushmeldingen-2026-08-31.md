# "Bezig…" knop blijft draaien bij pushmeldingen

## Wat er gebeurt

De knop bij Pushmeldingen (pagina Gezin) wacht op de service worker van de app. In de preview — en in elke omgeving zonder actieve service worker — wordt die nooit geregistreerd: registratie wordt bewust overgeslagen in dev-modus en binnen een iframe (de preview draait in een iframe). Het wachten heeft geen tijdslimiet, dus de knop blijft eeuwig op "Bezig…" staan en er verschijnt nooit een fout- of succesmelding.

## Aanpak

1. **Nooit oneindig wachten.** Het wachten op de service worker krijgt een tijdslimiet (ca. 10 seconden). Loopt die af, dan stopt de actie met een duidelijke melding in plaats van te blijven draaien.
2. **Service worker gericht klaarzetten.** Bij het aanzetten van meldingen wordt eerst gecontroleerd of er al een actieve registratie is; zo niet, dan wordt er één geprobeerd te registreren voordat er geabonneerd wordt.
3. **Eerlijke melding als het niet kan.** Is push in de huidige context onmogelijk (preview/iframe of dev), dan toont het blok dat meteen: knop uitgeschakeld met de uitleg dat pushmeldingen alleen werken op de gepubliceerde app, geopend in een eigen browsertabblad (niet in de preview).
4. **Statuscheck bij laden ook begrensd**, zodat de weergave "Aan/Uit" niet op een hangende belofte wacht.

## Technische details

- `src/lib/push.ts`: helper `wachtOpServiceWorker(timeoutMs)` die `navigator.serviceWorker.ready` combineert met een timeout via `Promise.race`; gebruikt in `huidigPushAbonnement()` en `schakelPushIn()`. In `schakelPushIn()` eerst `getRegistration()` en zo nodig `register()` aanroepen. Nieuwe export `pushMogelijkInDezeContext()` die dev/iframe herkent (zelfde logica als `src/lib/register-sw.ts`).
- `src/components/push-instellingen.tsx`: rendert de uitlegtekst + uitgeschakelde knop wanneer push in deze context niet mogelijk is; `bezig` wordt altijd via `finally` teruggezet (blijft zo), en fouten uit de timeout komen als toast binnen.
- Geen wijzigingen aan de database, Edge Function of de service worker zelf.

## Verwacht resultaat

In de preview zie je direct waarom meldingen daar niet kunnen; op de gepubliceerde app registreert de knop de service worker en het abonnement, of geeft binnen enkele seconden een foutmelding — hij blijft niet meer hangen.
