// Excel-import van recepten (.xlsx, tabblad "Recepten"). Parsen + valideren
// staat los van het opslaan: opslaan gebeurt pas na expliciete bevestiging
// van de gebruiker in de voorbeeldweergave (recept-import-page.tsx).
//
// xlsx wordt dynamisch geladen (niet statisch geïmporteerd): het is een
// zware library die alleen deze ene, ouder-only pagina gebruikt — statisch
// importeren zou ~340KB aan elke paginalaad van de hele (mobile-first) app
// toevoegen, ook voor wie nooit importeert.
import type * as XLSXType from "xlsx";
import { RECEPT_CATEGORIEEN, type ReceptInvoer } from "./recepten";
import { kapitaliseer, naarRegels, naarTags } from "./tekst";

const VERPLICHTE_KOLOMMEN = ["titel", "categorie", "porties", "ingredienten"] as const;

export type ImportRij = {
  rijnummer: number; // Excel-rijnummer (header = rij 1)
  titel: string; // ruwe titel, ook getoond als een rij fouten heeft
  invoer: ReceptInvoer | null; // null zolang er fouten zijn
  fouten: string[];
  dubbel: boolean; // titel komt al voor in de gezinsapp of eerder in dit bestand
};

export type ImportResultaat = {
  headerFouten: string[];
  bladNaam: string;
  rijen: ImportRij[];
};

function tekst(waarde: unknown): string {
  if (waarde == null) return "";
  return String(waarde).trim();
}

function vindReceptenBlad(workbook: XLSXType.WorkBook): string {
  const gevonden = workbook.SheetNames.find((naam) => naam.trim().toLowerCase() === "recepten");
  return gevonden ?? workbook.SheetNames[0] ?? "";
}

function valideerRij(ruw: Record<string, unknown>, rijnummer: number): ImportRij {
  const fouten: string[] = [];
  const titel = tekst(ruw["titel"]);
  if (!titel) fouten.push("titel ontbreekt");

  const categorieRuw = tekst(ruw["categorie"]).toLowerCase();
  if (!categorieRuw) {
    fouten.push("categorie ontbreekt");
  } else if (!(RECEPT_CATEGORIEEN as readonly string[]).includes(categorieRuw)) {
    fouten.push(
      `categorie "${ruw["categorie"]}" is ongeldig (verwacht: ${RECEPT_CATEGORIEEN.join(" of ")})`,
    );
  }

  let porties: number | null = null;
  const portiesRuw = ruw["porties"];
  if (portiesRuw == null || tekst(portiesRuw) === "") {
    fouten.push("porties ontbreekt");
  } else {
    const n = Number(portiesRuw);
    if (!Number.isFinite(n)) fouten.push(`porties "${portiesRuw}" is geen getal`);
    else porties = n;
  }

  let tijd: number | null = null;
  const tijdRuw = ruw["tijd_min"];
  if (tijdRuw != null && tekst(tijdRuw) !== "") {
    const n = Number(tijdRuw);
    if (!Number.isFinite(n)) fouten.push(`tijd_min "${tijdRuw}" is geen getal`);
    else tijd = n;
  }

  const ingredienten = naarRegels(tekst(ruw["ingredienten"]));
  if (ingredienten.length === 0) fouten.push("ingrediënten ontbreken");

  const invoer: ReceptInvoer | null =
    fouten.length === 0
      ? {
          titel: kapitaliseer(titel),
          categorie: categorieRuw,
          beschrijving: null,
          bereidingstijd_minuten: tijd,
          porties,
          ingredienten,
          stappen: naarRegels(tekst(ruw["bereiding"])),
          tags: naarTags(tekst(ruw["tags"])),
          recept_url: tekst(ruw["url"]) || null,
        }
      : null;

  return { rijnummer, titel, invoer, fouten, dubbel: false };
}

export async function parseReceptenBestand(
  bestand: File,
  bestaandeTitels: Set<string>,
): Promise<ImportResultaat> {
  const XLSX = await import("xlsx");
  const buffer = await bestand.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const bladNaam = vindReceptenBlad(workbook);
  const blad = workbook.Sheets[bladNaam];
  if (!blad) {
    return {
      headerFouten: ["Kon geen leesbaar tabblad vinden in dit bestand."],
      bladNaam,
      rijen: [],
    };
  }

  const headerRij = (XLSX.utils.sheet_to_json(blad, { header: 1 })[0] ?? []) as unknown[];
  const kolommen = headerRij.map((k) => tekst(k).toLowerCase());
  const headerFouten = VERPLICHTE_KOLOMMEN.filter((k) => !kolommen.includes(k)).map(
    (k) => `Verplichte kolom "${k}" ontbreekt in de kopregel.`,
  );

  if (headerFouten.length > 0) {
    return { headerFouten, bladNaam, rijen: [] };
  }

  // defval: "" zodat een lege cel niet gewoon wegvalt uit het object —
  // anders is "kolom ontbreekt in deze rij" niet te onderscheiden van
  // "kolom bestaat, cel is leeg".
  const ruweRijen = XLSX.utils.sheet_to_json<Record<string, unknown>>(blad, { defval: "" });

  const titelsGezien = new Set<string>();
  const rijen = ruweRijen.map((ruw, i) => {
    const rij = valideerRij(ruw, i + 2);
    const key = rij.titel.trim().toLowerCase();
    if (key && (bestaandeTitels.has(key) || titelsGezien.has(key))) {
      rij.dubbel = true;
    }
    if (key) titelsGezien.add(key);
    return rij;
  });

  return { headerFouten: [], bladNaam, rijen };
}
