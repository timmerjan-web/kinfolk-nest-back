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

const INGREDIENTEN_WOORDEN = new Set(["ingrediënten", "ingredienten", "nodig"]);
const BEREIDING_WOORDEN = new Set(["bereiding", "stappen", "werkwijze", "aanpak", "methode"]);
const URL_REGEX = /https?:\/\/\S+/i;
const PORTIES_REGEX = /(?:voor\s+)?(\d+)\s*(?:personen|persoon|pers\.?)\b/i;
// "30 min", "45 minuten"; uren apart afgevangen door UUR_REGEX hieronder.
const MINUTEN_REGEX = /(\d+)\s*min(?:uten|uut)?\b/i;
// "1 uur 15", "1 uur", "1u15", "2 uur"
const UUR_REGEX = /(\d+)\s*u(?:ur)?\.?\s*(\d+)?/i;

const OPSOMMING_PREFIX = /^[•\-*]\s*/;
const NUMMERING_PREFIX = /^\s*\d+[.)]\s*/;

function stripOpsomming(regel: string): string {
  return regel.replace(OPSOMMING_PREFIX, "").trim();
}

function stripNummering(regel: string): string {
  return regel.replace(NUMMERING_PREFIX, "").trim();
}

function isLijstregel(regel: string): boolean {
  return OPSOMMING_PREFIX.test(regel) || NUMMERING_PREFIX.test(regel);
}

// Herleidt een regel tot de kale letters (emoji, leestekens, cijfers en
// overtollige spaties eruit) zodat "🥗 Ingrediënten:" en "INGREDIËNTEN 👇"
// nog steeds als het kopje "ingrediënten" herkend worden. Een regel met
// nog ander tekstueel materiaal ("Ingrediënten voor de saus") normaliseert
// naar iets anders dan het kale kopwoord en wordt terecht niet herkend.
function kernWoorden(regel: string): string {
  return regel
    .replace(/[^\p{L}\s]/gu, " ")
    .trim()
    .toLowerCase();
}

function isIngredientenKop(regel: string): boolean {
  return INGREDIENTEN_WOORDEN.has(kernWoorden(regel));
}

function isBereidingKop(regel: string): boolean {
  return BEREIDING_WOORDEN.has(kernWoorden(regel));
}

function isKopregel(regel: string): boolean {
  return isIngredientenKop(regel) || isBereidingKop(regel);
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
  let titelRegel: string | null = null;
  let kopGevonden = false;

  for (const regel of regels) {
    if (isIngredientenKop(regel)) {
      modus = "ingredienten";
      kopGevonden = true;
      continue;
    }
    if (isBereidingKop(regel)) {
      modus = "bereiding";
      kopGevonden = true;
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
      titelRegel = regel;
    }
  }

  // Geen enkel kopje gevonden, maar wel een opsomming: heel gebruikelijk
  // bij Instagram-bijschriften die meteen met de stappen beginnen, zonder
  // aparte "Ingrediënten"-sectie. Die bullets/nummering zijn duidelijk
  // bedoeld als stappenlijst — losse zinnen ertussenuit (bv. een afsluiter
  // als "Smakelijk!") tellen niet mee. Ingrediënten blijven leeg: die
  // zitten hier alleen los verweven in de stappen, en dat veilig uit
  // elkaar trekken kan niet zonder te gokken.
  if (!kopGevonden) {
    for (const regel of regels) {
      if (regel === titelRegel) continue;
      if (isLijstregel(regel)) {
        bereiding.push(stripNummering(stripOpsomming(regel)));
      }
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
