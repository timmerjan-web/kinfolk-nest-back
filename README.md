# Gezinsapp (kinfolk-nest-back)

De Lovable-gekoppelde build van Gezinsapp — recepten, weekmenu, boodschappen,
klusjes, prikbord en agenda voor het hele gezin. Dit is de TanStack
Start-versie die op [lovable.dev](https://lovable.dev) live meebouwt bij
elke push; de broncode/audit-geschiedenis van de fases staat in
[`timmer-corsica`](https://github.com/timmerjan-web/timmer-corsica), map
`gezinsapp/` (GitHub Pages-build, zelfde datamodel).

## Status

- **Fase 0/1 — Fundament**: Supabase-schema (`gezinnen`, `profiles` met rol
  ouder/kind, `gezin_uitnodigingen`), RLS vanaf de eerste migratie, auth
  (e-mail/wachtwoord + Google), onboarding (gezin aanmaken/aansluiten),
  app-shell met bottom-nav, PWA.
- **Fase 2 — Recepten**: gedeeld gezinskookboek (`recepten`-tabel, RLS
  gescoped op `gezin_id`). Elk gezinslid kan recepten toevoegen, bewerken en
  verwijderen — titel, beschrijving, bereidingstijd, porties, ingrediënten,
  bereidingswijze.
- Weekmenu/klusjes-tabs zijn nog placeholders — die volgen in latere fases.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kinfolk-nest-back.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b7776d0-bded-4cb2-b1d1-78fc1041a7f3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
