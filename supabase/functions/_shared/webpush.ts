// Gedeelde webpush-verzendlogica — gebruikt door send-push (per-event
// meldingen bij klusjes) en ivago-melden (geplande afvalmelding).
// Ruimt zelf verlopen abonnementen op (404/410) zodat elke aanroeper
// dat niet apart hoeft te doen.
import webpush from "npm:web-push@3.6.7";
import type { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY =
  "BJH87fvXUMFNi0fYBhMRcWdr4-J9LqPl8uU1iQhxAsbbJPXnlnYDieaqw8H4dnBjyp3JlX5wF6jSsNWqFq-jbbQ";

let vapidGezet = false;
function zetVapidEenmalig() {
  if (vapidGezet) return;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:gezinsapp@example.com";
  if (!vapidPrivateKey) throw new Error("VAPID_PRIVATE_KEY ontbreekt.");
  webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC_KEY, vapidPrivateKey);
  vapidGezet = true;
}

export type PushPayload = { title: string; body: string; url: string };

// Stuurt payload naar alle geregistreerde toestellen van de opgegeven
// gebruikers. Geeft het aantal aangeschreven abonnementen terug (niet
// per se allemaal geslaagd — een enkele mislukte send blokkeert de rest
// niet).
export async function stuurPushNaarGebruikers(
  admin: ReturnType<typeof createClient>,
  gebruikerIds: string[],
  payload: PushPayload,
): Promise<number> {
  if (gebruikerIds.length === 0) return 0;
  zetVapidEenmalig();

  const { data: abonnementen, error } = await admin
    .from("push_abonnementen")
    .select("id, endpoint, p256dh, auth")
    .in("gebruiker_id", gebruikerIds);
  if (error) throw error;

  const payloadTekst = JSON.stringify(payload);

  await Promise.all(
    (abonnementen ?? []).map(async (abonnement) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abonnement.endpoint,
            keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
          },
          payloadTekst,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_abonnementen").delete().eq("id", abonnement.id);
        }
      }
    }),
  );

  return (abonnementen ?? []).length;
}
