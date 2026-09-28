// Gedeelde IVAGO-kennis voor de ivago-refresh en ivago-ronde-matchen
// Edge Functions: hoe je bij data.stad.gent komt, en hoe je een ruwe
// API-rij omzet naar { datum, ronde, fractie }.
//
// ✅ GEVERIFIEERD tegen de echte API (2026-09-28): exports/json geeft
// een kale JSON-array van platte rijen, één rij per (straat, datum) met
// velden o.a. straatnaam, kalender (de rondecode, bv. "C1A"), datum
// ("2026-07-28") en fracties (kommagescheiden tekst, bv. "GFT, PMD").
// Grofvuil staat er gewoon bij in de fracties-lijst en wordt hieronder
// weggefilterd.

export const IVAGO_VELD_DATUM = "datum";
export const IVAGO_VELD_RONDE = "kalender";
export const IVAGO_VELD_FRACTIE = "fracties";

// Fracties die uitdrukkelijk NIET meetellen voor de patroonmatching en
// de dagelijkse melding (grofvuil valt op wisselende, aparte dagen).
const GENEGEERDE_FRACTIES = new Set(["grofvuil", "grof vuil"]);

// Overschrijfbaar via de Edge Function-secret IVAGO_DATASET_ID — de
// dataset-id bevat het jaar en IVAGO publiceert jaarlijks een nieuwe
// (valkuil 2), dus hardcoderen zonder overschrijfbaarheid is geen optie.
export const STANDAARD_DATASET_ID = "afvalophaalkalender-ivago-woongebied-gent-2026-2027";

export type IvagoRecord = { datum: string; ronde: string; fractie: string };

function genormaliseerdeFractie(waarde: string): string {
  return waarde.trim().toLowerCase();
}

// Eén ruwe API-rij naar één of meer records: de "fracties"-tekst
// (bv. "GFT, GROFVUIL, PAPIER, PMD") wordt gesplitst op komma's tot
// aparte records, grofvuil eruit gefilterd.
export function ruweRijNaarRecords(rij: Record<string, unknown>): IvagoRecord[] {
  const datum = rij[IVAGO_VELD_DATUM];
  const ronde = rij[IVAGO_VELD_RONDE];
  const fracties = rij[IVAGO_VELD_FRACTIE];
  if (typeof datum !== "string" || typeof ronde !== "string" || typeof fracties !== "string") {
    return [];
  }
  return fracties
    .split(",")
    .map(genormaliseerdeFractie)
    .filter((f) => f.length > 0 && !GENEGEERDE_FRACTIES.has(f))
    .map((fractie) => ({ datum: datum.slice(0, 10), ronde, fractie }));
}

export function bouwExportsUrl(datasetId: string): string {
  return `https://data.stad.gent/api/v2/catalog/datasets/${encodeURIComponent(datasetId)}/exports/json`;
}

export async function haalRuweRijen(datasetId: string): Promise<Record<string, unknown>[]> {
  const resp = await fetch(bouwExportsUrl(datasetId));
  if (!resp.ok) {
    throw new Error(`IVAGO-dataset "${datasetId}" ophalen mislukt (HTTP ${resp.status}).`);
  }
  const data = (await resp.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error(
      `IVAGO-dataset "${datasetId}" gaf geen array terug — respons-vorm wijkt af van de aanname (zie het commentaar bovenaan _shared/ivago.ts).`,
    );
  }
  return data as Record<string, unknown>[];
}

// Groepeert records per ronde tot { datum: fracties[] }, gesorteerd op
// datum. Gebruikt door zowel ivago-refresh (opslaan) als
// ivago-ronde-matchen (vergelijken met de verificatiedata).
export function groepeerPerRonde(records: IvagoRecord[]): Map<string, Map<string, Set<string>>> {
  const perRonde = new Map<string, Map<string, Set<string>>>();
  for (const r of records) {
    const perDatum = perRonde.get(r.ronde) ?? new Map<string, Set<string>>();
    const fracties = perDatum.get(r.datum) ?? new Set<string>();
    fracties.add(r.fractie);
    perDatum.set(r.datum, fracties);
    perRonde.set(r.ronde, perDatum);
  }
  return perRonde;
}
