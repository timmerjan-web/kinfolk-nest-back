// Edge Function: verstuurt een webpush-melding wanneer een klusje wordt
// toegewezen. Bedoeld als doel van een Supabase Database Webhook op de
// tabel klusjes (events: Insert, Update) — geen CORS nodig, wordt alleen
// server-to-server door Supabase zelf aangeroepen, nooit vanuit de browser.
//
// Filtert zelf op "heeft nu een toegewezen_aan die net veranderd is",
// omdat een Dashboard-Database Webhook geen kolomspecifieke voorwaarde
// kan uitdrukken zoals de SQL-trigger uit Fase C dat wel kan.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY =
  "BPIe7iOR_Tx20hexHTx15weylVGTwKfnEOgnnURTkOYKCNqfKGQcCcw5K5g16ffJbZ4iXhfv7P0HpB-ywnyUPac";

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: { id: string; gezin_id: string; titel: string; toegewezen_aan: string | null } | null;
  old_record: { toegewezen_aan?: string | null } | null;
};

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const record = payload.record;

    if (!record?.toegewezen_aan) return json({ ok: true, reden: "geen toewijzing" });
    if (payload.type === "UPDATE" && record.toegewezen_aan === payload.old_record?.toegewezen_aan) {
      return json({ ok: true, reden: "toewijzing ongewijzigd" });
    }

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:gezinsapp@example.com";
    if (!vapidPrivateKey) throw new Error("VAPID_PRIVATE_KEY ontbreekt.");

    webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC_KEY, vapidPrivateKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: abonnementen, error } = await admin
      .from("push_abonnementen")
      .select("id, endpoint, p256dh, auth")
      .eq("gebruiker_id", record.toegewezen_aan);
    if (error) throw error;

    const payloadTekst = JSON.stringify({
      title: "Nieuw klusje toegewezen",
      body: record.titel,
      url: "/klusjes",
    });

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

    return json({ ok: true, verstuurd: (abonnementen ?? []).length });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Onbekende fout." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
