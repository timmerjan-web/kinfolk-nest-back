// Voorzichtige service-worker-registratie: nooit in dev, nooit in een
// iframe, met een ?sw=off kill-switch.
const SW_PATH = `${import.meta.env.BASE_URL}sw.js`;

function isRefusedContext(): { refused: boolean; reason?: string } {
  if (typeof window === "undefined") return { refused: true, reason: "ssr" };
  if (!("serviceWorker" in navigator)) return { refused: true, reason: "unsupported" };
  if (!import.meta.env.PROD) return { refused: true, reason: "dev" };

  try {
    if (window.top !== window.self) return { refused: true, reason: "iframe" };
  } catch {
    return { refused: true, reason: "iframe" };
  }

  if (new URLSearchParams(window.location.search).get("sw") === "off") {
    return { refused: true, reason: "kill-switch" };
  }

  return { refused: false };
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_PATH);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export async function registerServiceWorker() {
  const { refused } = isRefusedContext();
  if (refused) {
    await unregisterMatching();
    return;
  }
  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: import.meta.env.BASE_URL });
  } catch (err) {
    console.warn("[pwa] service worker registratie mislukt", err);
  }
}
