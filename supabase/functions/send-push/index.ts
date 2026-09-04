// Edge Function: verstuurt webpush-meldingen voor klusjes — bij
// toewijzing (tabel klusjes) én bij voltooiing (tabel
// klus_voltooiingen, gemeld aan de aanmaker). Bedoeld als doel van
// Supabase Database Webhooks/SQL-triggers op die twee tabellen — geen
// CORS nodig, wordt alleen server-to-server door Supabase aangeroepen.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY =
  "BJH87fvXUMFNi0fYBhMRcWdr4-J9LqPl8uU1iQhxAsbbJPXnlnYDieaqw8H4dnBjyp3JlX5wF6jSsNWqFq-jbbQ";

type KlusjesRecord = { id: string; gezin_id: string; titel: string; toegewezen_aan: string | null };
type VoltooiingRecord = { klusje_id: string; toegewezen_aan: string | null };

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: KlusjesRecord | VoltooiingRecord | null;
  old_record: { toegewezen_aan?: string | null } | null;
};

type Melding = { ontvangerId: string; titel: string; body: string };

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const melding = await bepaalMelding(admin, payload);
    if (!melding) return json({ ok: true, reden: "geen melding nodig" });

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:gezinsapp@example.com";
    if (!vapidPrivateKey) throw new Error("VAPID_PRIVATE_KEY ontbreekt.");

    webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC_KEY, vapidPrivateKey);

    const { data: abonnementen, error } = await admin
      .from("push_abonnementen")
      .select("id, endpoint, p256dh, auth")
      .eq("gebruiker_id", melding.ontvangerId);
    if (error) throw error;

    const payloadTekst = JSON.stringify({
      title: melding.titel,
      body: melding.body,
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

async function bepaalMelding(
  admin: ReturnType<typeof createClient>,
  payload: WebhookPayload,
): Promise<Melding | null> {
  if (payload.table === "klusjes") {
    const record = payload.record as KlusjesRecord | null;
    if (!record?.toegewezen_aan) return null;
    if (payload.type === "UPDATE" && record.toegewezen_aan === payload.old_record?.toegewezen_aan) {
      return null;
    }
    return { ontvangerId: record.toegewezen_aan, titel: "Nieuw klusje toegewezen", body: record.titel };
  }

  if (payload.table === "klus_voltooiingen") {
    const record = payload.record as VoltooiingRecord | null;
    if (!record) return null;
    const { data: klusje } = await admin
      .from("klusjes")
      .select("created_by, titel")
      .eq("id", record.klusje_id)
      .maybeSingle();
    if (!klusje?.created_by || klusje.created_by === record.toegewezen_aan) return null;

    let doorNaam: string | null = null;
    if (record.toegewezen_aan) {
      const { data: profiel } = await admin
        .from("profiles")
        .select("naam")
        .eq("id", record.toegewezen_aan)
        .maybeSingle();
      doorNaam = profiel?.naam ?? null;
    }

    return {
      ontvangerId: klusje.created_by,
      titel: "Klusje voltooid",
      body: doorNaam ? `${doorNaam} heeft "${klusje.titel}" afgerond` : `"${klusje.titel}" is afgerond`,
    };
  }

  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
