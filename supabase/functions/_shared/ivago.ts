// Gedeelde IVAGO-kennis voor de ivago-refresh en ivago-ronde-matchen
// Edge Functions: hoe je bij data.stad.gent komt, en hoe je een ruwe
// API-rij omzet naar { datum, ronde, fractie }.
//
// ⚠️ ONGEVERIFIEERD — dit is opgebouwd zonder toegang tot
// data.stad.gent (netwerk-egress was geblokkeerd in de sandbox waarin
// dit geschreven is). De aannames hieronder zijn gebaseerd op de
// gangbare Opendatasoft v2-conventie, niet op een echte call. Voordat
// dit iets zinnigs doet, moet iemand met internettoegang (bv. Lovable):
//
//   1. https://data.stad.gent/api/v2/catalog/datasets/<dataset-id>/records?limit=3
//      opvragen en de veldnamen vergelijken met IVAGO_VELD_* hieronder.
//   2. Controleren of één rij één (datum, ronde, fractie) is
//      ("lang formaat", de huidige aanname in ruweRijNaarRecord) of
//      één (datum, ronde) met meerdere fractie-kolommen ernaast
//      ("breed formaat") — pas in dat laatste geval alleen
//      ruweRijNaarRecords() hieronder aan, de rest van de pijplijn
//      (ivago-refresh, ivago-melden, de database) hoeft niet te
//      veranderen.
//   3. De ivago-ronde-matchen-functie draaien (zie dat bestand) om de
//      rondecode voor het eerste gezin te bepalen.
//
// Bevestig ook de exports/json-respons: dit bestand gaat ervan uit dat
// die een kale JSON-array van objecten teruggeeft (de gangbare
// Opendatasoft-vorm), zonder envelope zoals { results: [...] }.

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

// Eén ruwe API-rij naar één of meer records. Bij het "lange formaat"
// (huidige aanname) is dat er precies één; bij een eventueel "breed
// formaat" zou dit meerdere fractie-kolommen naast elkaar moeten lezen
// (zie de opmerking bovenaan dit bestand).
export function ruweRijNaarRecords(rij: Record<string, unknown>): IvagoRecord[] {
  const datum = rij[IVAGO_VELD_DATUM];
  const ronde = rij[IVAGO_VELD_RONDE];
  const fractie = rij[IVAGO_VELD_FRACTIE];
  if (typeof datum !== "string" || typeof ronde !== "string" || typeof fractie !== "string") {
    return [];
  }
  const fractieNorm = genormaliseerdeFractie(fractie);
  if (GENEGEERDE_FRACTIES.has(fractieNorm)) return [];
  return [{ datum: datum.slice(0, 10), ronde, fractie: fractieNorm }];
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
