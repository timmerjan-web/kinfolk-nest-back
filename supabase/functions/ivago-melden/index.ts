// Edge Function: geplande melding voor de IVAGO-afvalophaalkalender
// (Deel 2) + optioneel klusje aanmaken (Deel 3).
//
// Bedoeld om elk UUR te draaien via pg_cron/pg_net (zie de migratie).
// Cron zelf kan geen "18u Belgische tijd" uitdrukken — een vast UTC-uur
// klopt niet het hele jaar door de zomer/winter-overgang (valkuil 1).
// Daarom draait dit elk uur en bepaalt de functie zelf, via Intl met
// tijdzone Europe/Brussels, of het nu echt 18u lokaal is; buiten dat
// uur is een aanroep een goedkope no-op. Dat maakt de aanroep ook
// veilig tegen extra/foute cron-aanroepen — nooit een schadelijke
// bijwerking buiten het beoogde moment.
//
// Dedup (valkuil 3): waste_collections.gemeld_op wordt gezet zodra een
// ronde voor een datum is gemeld; een tweede aanroep binnen hetzelfde
// lokale uur (of een herstart) meldt dus nooit twee keer.
import { createClient } from "npm:@supabase/supabase-js@2";
import { stuurPushNaarGebruikers } from "../_shared/webpush.ts";

const BRUSSEL_TZ = "Europe/Brussels";
const DOEL_LOKAAL_UUR = 18;

const FRACTIE_LABELS: Record<string, string> = { gft: "GFT", pmd: "PMD" };

type Huishouden = { id: string; klusjeAanmaken: boolean };

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const lokaalUur = huidigLokaalUur(BRUSSEL_TZ);
    if (lokaalUur !== DOEL_LOKAAL_UUR) {
      return json({ ok: true, reden: `niet ${DOEL_LOKAAL_UUR}u lokaal (nu ${lokaalUur}u)` });
    }

    const morgen = lokaleDatumMorgen(BRUSSEL_TZ);

    const { data: gezinnen, error } = await admin
      .from("gezinnen")
      .select("id, ivago_ronde, ivago_klusje_aanmaken")
      .not("ivago_ronde", "is", null);
    if (error) throw error;

    const perRonde = new Map<string, Huishouden[]>();
    for (const g of gezinnen ?? []) {
      if (!g.ivago_ronde?.trim()) continue;
      const lijst = perRonde.get(g.ivago_ronde) ?? [];
      lijst.push({ id: g.id, klusjeAanmaken: !!g.ivago_klusje_aanmaken });
      perRonde.set(g.ivago_ronde, lijst);
    }

    let gemeld = 0;
    const fouten: string[] = [];

    for (const [ronde, huishoudens] of perRonde) {
      try {
        if (await verwerkRonde(admin, ronde, morgen, huishoudens)) gemeld++;
      } catch (err) {
        fouten.push(`${ronde}: ${err instanceof Error ? err.message : "onbekende fout"}`);
      }
    }

    return json({
      ok: fouten.length === 0,
      gemeld,
      fouten: fouten.length > 0 ? fouten : undefined,
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Onbekende fout." }, 500);
  }
});

async function verwerkRonde(
  admin: ReturnType<typeof createClient>,
  ronde: string,
  morgen: string,
  huishoudens: Huishouden[],
): Promise<boolean> {
  const { data: ophaling, error } = await admin
    .from("waste_collections")
    .select("id, fracties, gemeld_op")
    .eq("ronde", ronde)
    .eq("datum", morgen)
    .maybeSingle();
  if (error) throw error;
  if (!ophaling || ophaling.gemeld_op) return false;

  const fractieLijst = formatteerFracties(ophaling.fracties);
  const gezinIds = huishoudens.map((h) => h.id);

  const { data: leden, error: ledenError } = await admin
    .from("profiles")
    .select("id")
    .in("gezin_id", gezinIds);
  if (ledenError) throw ledenError;

  const gebruikerIds = (leden ?? []).map((l) => l.id);
  await stuurPushNaarGebruikers(admin, gebruikerIds, {
    title: "Afvalophaling morgen",
    body: `Morgen ophaling: ${fractieLijst} — buitenzetten vanavond.`,
    url: "/agenda",
  });

  for (const huishouden of huishoudens) {
    if (huishouden.klusjeAanmaken) {
      await maakAfvalKlusje(admin, huishouden.id, morgen, fractieLijst);
    }
  }

  const { error: updateError } = await admin
    .from("waste_collections")
    .update({ gemeld_op: new Date().toISOString() })
    .eq("id", ophaling.id);
  if (updateError) throw updateError;

  return true;
}

// Onbeheerd klusje (nooit automatisch toegewezen) voor de avond vóór
// de ophaling. Koppelt aan de standaard "Afval buitenzetten"-catalogus-
// klus als die nog onder die naam bestaat; zo niet, gewoon zonder
// koppeling — dat mag deze melding nooit blokkeren.
async function maakAfvalKlusje(
  admin: ReturnType<typeof createClient>,
  gezinId: string,
  morgen: string,
  fractieLijst: string,
) {
  const { data: sjabloon } = await admin
    .from("klus_sjablonen")
    .select("id")
    .eq("gezin_id", gezinId)
    .eq("titel", "Afval buitenzetten")
    .maybeSingle();

  const vandaag = vorigeDagStr(morgen);

  const { error } = await admin.from("klusjes").insert({
    gezin_id: gezinId,
    titel: `Afval buitenzetten — ${fractieLijst}`,
    deadline: vandaag,
    toegewezen_aan: null,
    sjabloon_id: sjabloon?.id ?? null,
    herhaling: null,
  });
  if (error) throw error;
}

function fractieLabel(f: string): string {
  return FRACTIE_LABELS[f] ?? f.charAt(0).toUpperCase() + f.slice(1);
}

function formatteerFracties(fracties: string[]): string {
  const labels = fracties.map(fractieLabel);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} en ${labels[labels.length - 1]}`;
}

// Huidig lokaal uur (0-23) in de opgegeven IANA-tijdzone, DST-veilig
// via Intl i.p.v. een vaste UTC-offset. "% 24" vangt de eigenaardigheid
// van sommige ICU-implementaties die middernacht als "24" teruggeven.
function huidigLokaalUur(tijdzone: string): number {
  const delen = new Intl.DateTimeFormat("en-GB", {
    timeZone: tijdzone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const uur = delen.find((d) => d.type === "hour")?.value ?? "0";
  return Number(uur) % 24;
}

function lokaleDatumDelen(
  tijdzone: string,
  datum: Date,
): { jaar: number; maand: number; dag: number } {
  const delen = new Intl.DateTimeFormat("en-CA", {
    timeZone: tijdzone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(datum);
  const vind = (type: string) => Number(delen.find((d) => d.type === type)?.value ?? "0");
  return { jaar: vind("year"), maand: vind("month"), dag: vind("day") };
}

// Kalenderdag ná vandaag (lokaal), als YYYY-MM-DD-string. Rekent puur
// op datumdelen (niet op een 24u-optelling), zodat dit ook rond de
// zomer/winter-overgang de juiste kalenderdag geeft.
function lokaleDatumMorgen(tijdzone: string): string {
  const { jaar, maand, dag } = lokaleDatumDelen(tijdzone, new Date());
  const morgen = new Date(Date.UTC(jaar, maand - 1, dag + 1));
  return toDatumString(morgen);
}

function vorigeDagStr(datumStr: string): string {
  const [jaar, maand, dag] = datumStr.split("-").map(Number);
  const vorige = new Date(Date.UTC(jaar, maand - 1, dag - 1));
  return toDatumString(vorige);
}

function toDatumString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dag = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dag}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
