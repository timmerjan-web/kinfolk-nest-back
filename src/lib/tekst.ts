// Kapitaliseert de eerste letter — voor consistente weergave van
// klusjes, recepten en boodschappen ongeacht hoe iemand het intypt.
export function kapitaliseer(tekst: string): string {
  if (!tekst) return tekst;
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

// Zet een meerregelig tekstveld (ingrediënten/bereidingsstappen) om naar
// losse regels: lege regels weg, voorloop-nummering ("1.", "2)") gestript.
export function naarRegels(tekst: string): string[] {
  return tekst
    .split(/\r?\n+/)
    .map((regel) => regel.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

// Zet een komma-gescheiden tekstveld (tags) om naar losse, gekapitaliseerde
// waarden zonder duplicaten.
export function naarTags(tekst: string): string[] {
  const gezien = new Set<string>();
  const resultaat: string[] = [];
  for (const deel of tekst.split(",")) {
    const tag = deel.trim().toLowerCase();
    if (tag && !gezien.has(tag)) {
      gezien.add(tag);
      resultaat.push(tag);
    }
  }
  return resultaat;
}
