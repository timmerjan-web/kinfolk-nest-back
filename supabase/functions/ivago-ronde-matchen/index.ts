// Eenmalig diagnose-hulpmiddel, GEEN onderdeel van de gewone
// draaiende app: bepaalt de IVAGO-rondecode voor Zilverberklaan
// (Wondelgem) door elke rondecode in de dataset te vergelijken met de
// bekende, rechtstreeks-van-ivago.be-afgelezen verificatiedata. Schrijft
// niets weg — roep aan, lees de JSON-respons, en zet de gevonden code
// handmatig in gezinnen.ivago_ronde (via de Gezin-instellingen-UI of
// rechtstreeks in de database).
//
// Aanroepen: GET/POST naar deze functie-URL, optioneel
// ?dataset_id=... om een andere dataset te proberen dan de standaard.
//
// Dit hulpmiddel is precies waar de aannames in _shared/ivago.ts voor
// het eerst echt getoetst worden — als het resultaat "geen match"
// geeft, begin de diagnose dan bij de veldnamen daar (zie het
// commentaar bovenaan dat bestand), niet bij dit bestand.
import {
  groepeerPerRonde,
  haalRuweRijen,
  ruweRijNaarRecords,
  STANDAARD_DATASET_ID,
} from "../_shared/ivago.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rechtstreeks van ivago.be afgelezen voor Zilverberklaan (Wondelgem,
// 9032) — zie de sessienotities. Fracties in canonieke, kleine vorm.
const VERIFICATIE: { datum: string; fracties: string[] }[] = [
  { datum: "2026-09-07", fracties: ["gft", "papier", "pmd"] },
  { datum: "2026-09-14", fracties: ["restafval"] },
  { datum: "2026-09-21", fracties: ["gft", "pmd"] },
  { datum: "2026-09-28", fracties: ["restafval"] },
  { datum: "2026-10-05", fracties: ["gft", "papier", "pmd"] },
  { datum: "2026-10-12", fracties: ["restafval"] },
  { datum: "2026-10-19", fracties: ["gft", "pmd"] },
  { datum: "2026-10-26", fracties: ["restafval"] },
];

const CANONIEKE_FRACTIES = ["restafval", "gft", "papier", "pmd"] as const;

// Ruwe fractiewaarden in de dataset spellen mogelijk anders dan onze
// canonieke namen (bv. "PMD (plastic, metaal, drankkarton)") — matchen
// op "bevat", niet op exacte gelijkheid.
function naarCanoniekeFractie(ruw: string): string | null {
  const laag = ruw.toLowerCase();
  for (const kanoniek of CANONIEKE_FRACTIES) {
    if (laag.includes(kanoniek)) return kanoniek;
  }
  return null;
}

function setsGelijk(a: string[], b: Set<string>): boolean {
  if (a.length !== b.size) return false;
  return a.every((x) => b.has(x));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const url = new URL(req.url);
    const datasetId = url.searchParams.get("dataset_id") || STANDAARD_DATASET_ID;

    const ruweRijen = await haalRuweRijen(datasetId);
    const records = ruweRijen.flatMap(ruweRijNaarRecords).map((r) => ({
      ...r,
      fractie: naarCanoniekeFractie(r.fractie) ?? r.fractie,
    }));

    if (records.length === 0) {
      return json({
        ok: false,
        error:
          "0 bruikbare rijen na parsing — de veldnamen in _shared/ivago.ts kloppen vermoedelijk niet. Haal een paar ruwe rijen los op om te vergelijken.",
        ruwVoorbeeld: ruweRijen.slice(0, 3),
      });
    }

    const perRonde = groepeerPerRonde(records);
    const scores = [...perRonde.entries()].map(([ronde, perDatum]) => {
      let treffers = 0;
      const details = VERIFICATIE.map((v) => {
        const gevonden = perDatum.get(v.datum);
        const klopt = !!gevonden && setsGelijk(v.fracties, gevonden);
        if (klopt) treffers++;
        return {
          datum: v.datum,
          verwacht: v.fracties,
          gevonden: gevonden ? [...gevonden].sort() : null,
          klopt,
        };
      });
      return { ronde, treffers, van: VERIFICATIE.length, details };
    });

    scores.sort((a, b) => b.treffers - a.treffers);
    const exacteMatch = scores.filter((s) => s.treffers === VERIFICATIE.length);

    return json({
      ok: true,
      datasetId,
      aantalRondes: perRonde.size,
      exacteMatch: exacteMatch.map((s) => s.ronde),
      // Bij twijfel: de top 5 met het hoogste aantal treffers, inclusief
      // per-datum-detail, om handmatig te kunnen beoordelen wat afwijkt.
      top5: scores.slice(0, 5),
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Onbekende fout." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
