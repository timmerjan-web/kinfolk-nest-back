// Deterministische kleur per gezinslid — voor visuele identificatie
// (bv. in de agenda, wie heeft wat gepland) zonder dat we per profiel
// een kleur hoeven op te slaan.
const PALET = [
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-pink-400",
  "bg-teal-400",
  "bg-orange-400",
];

export function kleurVoorPersoon(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALET[hash % PALET.length] ?? "bg-muted-foreground/30";
}
