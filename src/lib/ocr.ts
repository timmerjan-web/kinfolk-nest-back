// Tekstherkenning op het toestel zelf (Tesseract.js, WASM) — geen
// externe AI-API. Dynamisch geïmporteerd: een zware library die alleen
// nodig is bij het inlezen van een screenshot, niet bij elke paginalaad.
import { parseRecept } from "./parseRecept";
import { createConceptRecept } from "./recepten";

export async function herkenTekstUitAfbeelding(bestand: File | Blob): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("nld");
  try {
    const { data } = await worker.recognize(bestand);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// OCR + parser + concept aanmaken in één stap — gebruikt zowel door de
// upload-knop in de app als door de share_target-afhandeling van een
// gedeelde screenshot (deel-ontvangen.tsx).
export async function maakConceptVanScreenshot(
  bestand: File | Blob,
  gezinId: string,
  userId: string,
) {
  const ruweTekst = await herkenTekstUitAfbeelding(bestand);
  const geparsed = parseRecept(ruweTekst);
  return createConceptRecept(gezinId, userId, {
    titel: geparsed.titel || "Gedeeld recept",
    ...(geparsed.categorie ? { categorie: geparsed.categorie } : {}),
    bereidingstijd_minuten: geparsed.tijd_min,
    porties: geparsed.porties,
    ingredienten: geparsed.ingredienten,
    stappen: geparsed.bereiding,
    tags: geparsed.tags,
    recept_url: geparsed.url,
    bron: "screenshot",
    bron_url: geparsed.url,
    ruwe_tekst: ruweTekst,
  });
}
