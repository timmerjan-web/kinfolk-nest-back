// Vaste, curated iconenset voor klus-sjablonen — bewust géén dynamische
// lucide-import op naam (dat kan runtime stuk gaan bij een typefout);
// deze lijst wordt statisch geïmporteerd, dus een verkeerde naam breekt
// meteen de build i.p.v. pas in productie.
import {
  ChefHat,
  ListChecks,
  Shirt,
  Sparkles,
  Trash2,
  Utensils,
  UtensilsCrossed,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

export const KLUS_ICONEN: Record<string, LucideIcon> = {
  Utensils,
  UtensilsCrossed,
  WashingMachine,
  Shirt,
  Trash2,
  ChefHat,
  Sparkles,
  ListChecks,
};

export function klusIcoon(naam: string): LucideIcon {
  return KLUS_ICONEN[naam] ?? ListChecks;
}
