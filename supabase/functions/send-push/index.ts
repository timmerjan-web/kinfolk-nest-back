// Edge Function: verstuurt webpush-meldingen voor klusjes — bij
// toewijzing (tabel klusjes) én bij voltooiing (tabel
// klus_voltooiingen, gemeld aan de aanmaker). Bedoeld als doel van
// Supabase Database Webhooks/SQL-triggers op die twee tabellen — geen
// CORS nodig, wordt alleen server-to-server door Supabase aangeroepen.
import { createClient } from "npm:@supabase/supabase-js@2";
import { stuurPushNaarGebruikers } from "../_shared/webpush.ts";

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

    const verstuurd = await stuurPushNaarGebruikers(admin, [melding.ontvangerId], {
      title: melding.titel,
      body: melding.body,
      url: "/klusjes",
    });

    return json({ ok: true, verstuurd });
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
    return {
      ontvangerId: record.toegewezen_aan,
      titel: "Nieuw klusje toegewezen",
      body: record.titel,
    };
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
      body: doorNaam
        ? `${doorNaam} heeft "${klusje.titel}" afgerond`
        : `"${klusje.titel}" is afgerond`,
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
