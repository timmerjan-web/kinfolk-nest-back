// Regelgebaseerde parser voor een gedeeld Instagram-bijschrift — GEEN
// externe AI-API. Verzint nooit inhoud: wat niet met zekerheid herkend
// wordt, blijft leeg/null. Puur, geen I/O, dus makkelijk te testen.

export type ParsedRecept = {
  titel: string;
  categorie: string;
  porties: number | null;
  tijd_min: number | null;
  ingredienten: string[];
  bereiding: string[];
  tags: string[];
  url: string | null;
};

const INGREDIENTEN_KOP = /^(ingredi[eë]nten|nodig)\s*:?\s*$/i;
const BEREIDING_KOP = /^(bereiding|stappen|werkwijze|aanpak|methode)\s*:?\s*$/i;
const URL_REGEX = /https?:\/\/\S+/i;
const PORTIES_REGEX = /(?:voor\s+)?(\d+)\s*(?:personen|persoon|pers\.?)\b/i;
// "30 min", "45 minuten"; uren apart afgevangen door UUR_REGEX hieronder.
const MINUTEN_REGEX = /(\d+)\s*min(?:uten|uut)?\b/i;
// "1 uur 15", "1 uur", "1u15", "2 uur"
const UUR_REGEX = /(\d+)\s*u(?:ur)?\.?\s*(\d+)?/i;

function stripOpsomming(regel: string): string {
  return regel.replace(/^[•\-*]\s*/, "").trim();
}

function stripNummering(regel: string): string {
  return regel.replace(/^\s*\d+[.)]\s*/, "").trim();
}

function isKopregel(regel: string): boolean {
  return INGREDIENTEN_KOP.test(regel) || BEREIDING_KOP.test(regel);
}

// Een regel die enkel uit hashtags bestaat ("#pasta #snel #vegetarisch"),
// ongeacht hoeveel — niet slechts een enkel #-woord.
function isHashtagRegel(regel: string): boolean {
  const woorden = regel.split(/\s+/);
  return woorden.length > 0 && woorden.every((w) => w.startsWith("#"));
}

// Een regel die niets anders bevat dan een link — typisch de meegestuurde
// bron-URL onderaan het bijschrift. Die hoort niet als bereidingsstap of
// ingrediënt te eindigen, ongeacht in welke modus de parser net zit.
function isUrlRegel(regel: string): boolean {
  return new RegExp(`^${URL_REGEX.source}$`, "i").test(regel);
}

function isHoeveelheidsregel(regel: string): boolean {
  return PORTIES_REGEX.test(regel) || MINUTEN_REGEX.test(regel) || UUR_REGEX.test(regel);
}

function vindPorties(tekst: string): number | null {
  const match = tekst.match(PORTIES_REGEX);
  return match ? Number(match[1]) : null;
}

function vindTijdMinuten(tekst: string): number | null {
  const uurMatch = tekst.match(UUR_REGEX);
  if (uurMatch) {
    const uren = Number(uurMatch[1]);
    const minuten = uurMatch[2] ? Number(uurMatch[2]) : 0;
    return uren * 60 + minuten;
  }
  const minutenMatch = tekst.match(MINUTEN_REGEX);
  return minutenMatch ? Number(minutenMatch[1]) : null;
}

function vindUrl(tekst: string): string | null {
  const match = tekst.match(URL_REGEX);
  return match ? match[0] : null;
}

export function parseRecept(tekst: string): ParsedRecept {
  const regels = tekst
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r !== "" && !isHashtagRegel(r) && !isUrlRegel(r));

  const ingredienten: string[] = [];
  const bereiding: string[] = [];
  let modus: "geen" | "ingredienten" | "bereiding" = "geen";
  let titel = "";

  for (const regel of regels) {
    if (INGREDIENTEN_KOP.test(regel)) {
      modus = "ingredienten";
      continue;
    }
    if (BEREIDING_KOP.test(regel)) {
      modus = "bereiding";
      continue;
    }
    if (modus === "ingredienten") {
      const item = stripOpsomming(regel);
      if (item) ingredienten.push(item);
      continue;
    }
    if (modus === "bereiding") {
      const stap = stripNummering(regel);
      if (stap) bereiding.push(stap);
      continue;
    }
    // Nog geen kopje gevonden: eerste betekenisvolle regel die niet
    // zelf een kopje of een losse hoeveelheid/tijd-vermelding is, wordt
    // de titel.
    if (!titel && !isKopregel(regel) && !isHoeveelheidsregel(regel)) {
      titel = stripOpsomming(regel);
    }
  }

  return {
    titel,
    categorie: "",
    porties: vindPorties(tekst),
    tijd_min: vindTijdMinuten(tekst),
    ingredienten,
    bereiding,
    tags: [],
    url: vindUrl(tekst),
  };
}
