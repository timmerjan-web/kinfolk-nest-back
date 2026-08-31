// Web push voor Android/Chrome — vraagt toestemming en abonneert
// alleen bij een expliciete gebruikersactie (nooit automatisch bij
// het laden van de app).
import { supabase } from "@/integrations/supabase/client";

// VAPID publieke sleutel — veilig om te committen, is per ontwerp
// publiek. De privésleutel staat alleen server-side (Edge Function-
// secret VAPID_PRIVATE_KEY), nooit hier.
const VAPID_PUBLIC_KEY =
  "BJH87fvXUMFNi0fYBhMRcWdr4-J9LqPl8uU1iQhxAsbbJPXnlnYDieaqw8H4dnBjyp3JlX5wF6jSsNWqFq-jbbQ";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function pushOndersteund(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Push werkt alleen als de service worker daadwerkelijk geregistreerd
// wordt: niet in dev en niet binnen een iframe (zoals de preview).
export function pushMogelijkInDezeContext(): boolean {
  if (!pushOndersteund()) return false;
  if (!import.meta.env.PROD) return false;
  try {
    if (window.top !== window.self) return false;
  } catch {
    return false;
  }
  return true;
}

async function wachtOpServiceWorker(timeoutMs = 10000): Promise<ServiceWorkerRegistration> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, afwijzen) => {
        timer = setTimeout(
          () => afwijzen(new Error("De achtergrondservice voor meldingen reageert niet.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Wacht tot er een actieve worker is. Pollen is betrouwbaarder dan
// statechange-events of navigator.serviceWorker.ready: die blijven soms
// hangen of missen een overgang die al gebeurd is.
async function wachtOpActivatie(
  registratie: ServiceWorkerRegistration,
  timeoutMs = 15000,
): Promise<ServiceWorkerRegistration> {
  const deadline = Date.now() + timeoutMs;
  let huidige: ServiceWorkerRegistration | undefined = registratie;
  while (Date.now() < deadline) {
    if (huidige?.active) return huidige;
    try {
      await huidige?.update();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 300));
    huidige = (await navigator.serviceWorker.getRegistration()) ?? huidige;
  }
  if (huidige?.active) return huidige;
  throw new Error("De achtergrondservice voor meldingen reageert niet.");
}


export async function huidigPushAbonnement(): Promise<PushSubscription | null> {
  if (!pushOndersteund()) return null;
  const bestaande = await navigator.serviceWorker.getRegistration();
  if (!bestaande) return null;
  const registratie = await wachtOpActivatie(bestaande, 5000);
  return registratie.pushManager.getSubscription();
}

export async function schakelPushIn(gezinId: string, userId: string): Promise<void> {
  if (!pushOndersteund()) {
    throw new Error("Pushmeldingen worden niet ondersteund op dit toestel.");
  }

  const toestemming = await Notification.requestPermission();
  if (toestemming !== "granted") {
    throw new Error("Geen toestemming gekregen voor meldingen.");
  }

  const { registerServiceWorkerStrikt } = await import("@/lib/register-sw");
  const bestaande = await navigator.serviceWorker.getRegistration();
  const registratie = await wachtOpActivatie(bestaande ?? (await registerServiceWorkerStrikt()));

  const bestaandAbonnement = await registratie.pushManager.getSubscription();
  let abonnement: PushSubscription;
  try {
    abonnement =
      bestaandAbonnement ??
      (await registratie.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
  } catch (err) {
    const reden = err instanceof Error ? err.message : String(err);
    throw new Error(`Aanmelden bij de meldingsdienst mislukte: ${reden}`);
  }


  const json = abonnement.toJSON();
  const p256dh = json.keys?.["p256dh"];
  const auth = json.keys?.["auth"];
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("Push-abonnement kon niet worden aangemaakt.");
  }

  const { error } = await supabase
    .from("push_abonnementen")
    .upsert(
      { gezin_id: gezinId, gebruiker_id: userId, endpoint: json.endpoint, p256dh, auth },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function schakelPushUit(): Promise<void> {
  const abonnement = await huidigPushAbonnement();
  if (!abonnement) return;
  const endpoint = abonnement.endpoint;
  await abonnement.unsubscribe();
  const { error } = await supabase.from("push_abonnementen").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
