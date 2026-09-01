/// <reference lib="webworker" />
// Eigen service worker-bron (injectManifest i.p.v. de automatisch
// gegenereerde generateSW-variant) — nodig om zelf een push-event te
// kunnen afhandelen. De runtime-caching-regels hieronder zijn 1-op-1
// overgenomen uit de vorige generateSW-config in vite.config.ts, zodat
// het offline-/cachegedrag niet verandert.
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

// injectManifest vereist ergens in de bron een verwijzing naar
// self.__WB_MANIFEST als injectiepunt — die kant-en-klare lijst wordt
// hier bewust niet doorgegeven aan precacheAndRoute()/een
// PrecacheController. Workbox's eigen precache-install faalt namelijk
// hard (de hele service worker-installatie mislukt) zodra ook maar één
// van die bestanden niet op te halen is, en dat is onmogelijk van
// buitenaf op te vangen (event.waitUntil() wordt al binnen in Workbox
// zelf aangeroepen, vóórdat je zelf nog kunt ingrijpen) — precies de
// oorzaak van "de achtergrondservice kon niet worden geïnstalleerd" bij
// pushmeldingen aanzetten. De vier runtime-caching-regels hieronder
// geven hetzelfde cachegedrag zonder dat risico: die falen per
// opzichzelfstaand verzoek, nooit voor de hele installatie.
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: unknown;
  }
}
// console.info geeft een echt neveneffect, zodat minifiers deze regel
// (en daarmee het injectiepunt) niet als dode code verwijderen.
console.info("[sw] build-manifest (niet gebruikt voor precaching):", self.__WB_MANIFEST);

// Komt overeen met het oude registerType: "autoUpdate" — een nieuwe
// service worker neemt meteen het roer over, zonder te wachten tot
// alle open tabbladen gesloten zijn.
self.skipWaiting();
clientsClaim();

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "html-pages",
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 })] as any[],
  }),
);

registerRoute(
  ({ url, sameOrigin }) => sameOrigin && /\.(?:js|css|woff2?)$/.test(url.pathname),
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })] as any[],
  }),
);

registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })] as any[],
  }),
);

registerRoute(
  /\/rest\/v1\/.*/,
  new StaleWhileRevalidate({
    cacheName: "supabase-rest",
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ] as any[],
  }),
);

// Android/Chrome-pushmeldingen (Fase D klusjes-uitbreiding). De
// payload komt van de send-push Edge Function, getriggerd door een
// Database Webhook op klusjes.
type PushPayload = { title?: string; body?: string; url?: string };

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? "" };
  }

  const titel = data.title ?? "Gezinsapp";
  const doelUrl = data.url ?? self.registration.scope;

  event.waitUntil(
    self.registration.showNotification(titel, {
      body: data.body ?? "",
      icon: `${self.registration.scope}icon-192.png`,
      badge: `${self.registration.scope}icon-192.png`,
      data: { url: doelUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const doelUrl = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client) {
          void (client as WindowClient).navigate(doelUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(doelUrl);
    }),
  );
});
