// Edge Function: ververst de lokale waste_collections-cache vanuit de
// IVAGO-afvalophaalkalender (data.stad.gent) — bedoeld om periodiek
// (bv. wekelijks) te draaien via pg_cron, en handmatig aanroepbaar voor
// een eerste vulling/test. Roept de publieke Opendatasoft-API server-
// side aan (geen sleutel nodig, maar hoort niet in de browser thuis).
//
// Ververst alleen de ronde(s) die minstens één gezin heeft ingesteld
// (gezinnen.ivago_ronde) — geen zin om heel Gent te cachen voor één
// straat. Faalt nooit stil: elke poging (gelukt of niet) wordt
// gelogd in waste_calendar_status, zodat de UI kan waarschuwen als de
// kalender te lang niet is bijgewerkt (valkuil 2).
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  groepeerPerRonde,
  haalRuweRijen,
  ruweRijNaarRecords,
  STANDAARD_DATASET_ID,
  type IvagoRecord,
} from "../_shared/ivago.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hoeveel dagen terug nog bewaard blijven — puur zodat de tabel niet
// onbeperkt groeit, niet omdat oude data nog nuttig is.
const BEWAAR_VANAF_DAGEN_TERUG = 7;

// Rondes waarvan de kalender handmatig uit het IVAGO-agendabestand komt
// (geldig t/m 2027-03-31); die niet overschrijven met de open dataset.
const HANDMATIG_BEHEERDE_RONDES = new Set(["C1A"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const datasetId = Deno.env.get("IVAGO_DATASET_ID") || STANDAARD_DATASET_ID;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: gezinnen, error: gezinnenError } = await admin
      .from("gezinnen")
      .select("ivago_ronde")
      .not("ivago_ronde", "is", null);
    if (gezinnenError) throw gezinnenError;

    const rondes = [
      ...new Set(
        (gezinnen ?? []).map((g) => g.ivago_ronde).filter((r): r is string => !!r?.trim()),
      ),
    ];

    if (rondes.length === 0) {
      await schrijfStatus(admin, datasetId, { gelukt: true });
      return json({ ok: true, reden: "geen gezin heeft een ivago_ronde ingesteld" });
    }

    const ruweRijen = await haalRuweRijen(datasetId);
    const records: IvagoRecord[] = ruweRijen.flatMap(ruweRijNaarRecords);
    if (records.length === 0) {
      throw new Error(
        "Dataset gaf 0 bruikbare rijen — vermoedelijk kloppen de veldnamen in _shared/ivago.ts niet (zie het commentaar daar).",
      );
    }

    const perRonde = groepeerPerRonde(records);
    const vandaagGrens = new Date();
    vandaagGrens.setDate(vandaagGrens.getDate() - BEWAAR_VANAF_DAGEN_TERUG);
    const grensStr = toDatumString(vandaagGrens);

    let opgeslagen = 0;
    const ontbrekendeRondes: string[] = [];

    for (const ronde of rondes) {
      // Handmatig ingeladen uit het officiële IVAGO-agendabestand — de
      // open dataset bevat foute datums en zou die overschrijven.
      if (HANDMATIG_BEHEERDE_RONDES.has(ronde)) continue;
      const perDatum = perRonde.get(ronde);
      if (!perDatum || perDatum.size === 0) {
        ontbrekendeRondes.push(ronde);
        continue;
      }

      const rijen = [...perDatum.entries()]
        .filter(([datum]) => datum >= grensStr)
        .map(([datum, fracties]) => ({
          ronde,
          datum,
          fracties: [...fracties].sort(),
        }));

      if (rijen.length === 0) continue;

      const { error: upsertError } = await admin
        .from("waste_collections")
        .upsert(rijen, { onConflict: "ronde,datum" });
      if (upsertError) throw upsertError;
      opgeslagen += rijen.length;
    }

    if (ontbrekendeRondes.length === rondes.length) {
      throw new Error(
        `Geen van de ingestelde ronde(s) (${rondes.join(", ")}) komt voor in de dataset — verversing leverde niets op voor de komende periode.`,
      );
    }

    await schrijfStatus(admin, datasetId, { gelukt: true });
    return json({
      ok: true,
      opgeslagen,
      rondes,
      ontbrekendeRondes: ontbrekendeRondes.length > 0 ? ontbrekendeRondes : undefined,
    });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : "Onbekende fout.";
    await schrijfStatus(admin, datasetId, { gelukt: false, fout: bericht });
    return json({ ok: false, error: bericht }, 500);
  }
});

async function schrijfStatus(
  admin: ReturnType<typeof createClient>,
  datasetId: string,
  resultaat: { gelukt: true } | { gelukt: false; fout: string },
) {
  const nu = new Date().toISOString();
  const { data: bestaand } = await admin
    .from("waste_calendar_status")
    .select("laatst_gelukt_op")
    .eq("dataset_id", datasetId)
    .maybeSingle();

  await admin.from("waste_calendar_status").upsert({
    dataset_id: datasetId,
    laatste_poging_op: nu,
    laatst_gelukt_op: resultaat.gelukt ? nu : (bestaand?.laatst_gelukt_op ?? null),
    laatste_fout: resultaat.gelukt ? null : resultaat.fout,
  });
}

function toDatumString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dag}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
