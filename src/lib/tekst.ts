// Kapitaliseert de eerste letter — voor consistente weergave van
// klusjes, recepten en boodschappen ongeacht hoe iemand het intypt.
export function kapitaliseer(tekst: string): string {
  if (!tekst) return tekst;
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}
