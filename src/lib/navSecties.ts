// De 4 hoofdsecties van de onderste navigatiebalk (nav-herstructurering).
// Elke sectie hoort bij een verzameling routes (`hoortBij`) en heeft
// optioneel een sub-tabbalk (`subNav`) voor secties met meerdere
// bestemmingen. Bestaande URL's blijven ongewijzigd — dit is puur een
// nieuwe navigatielaag erbovenop, geen routewijziging.
import { CalendarClock, ChefHat, Home, Users, type LucideIcon } from "lucide-react";

export type SubNavItem = { to: string; label: string };

export type NavSectie = {
  key: string;
  label: string;
  icon: LucideIcon;
  hoortBij: (pathname: string) => boolean;
  subNav?: SubNavItem[];
  standaardPad: string;
};

export const NAV_SECTIES: NavSectie[] = [
  {
    key: "vandaag",
    label: "Vandaag",
    icon: Home,
    hoortBij: (p) => p === "/" || p.startsWith("/weekstart"),
    subNav: [
      { to: "/", label: "Vandaag" },
      { to: "/weekstart", label: "Deze week" },
    ],
    standaardPad: "/",
  },
  {
    key: "eten",
    label: "Eten",
    icon: ChefHat,
    hoortBij: (p) =>
      p.startsWith("/weekmenu") ||
      p.startsWith("/recepten") ||
      p.startsWith("/deel-ontvangen") ||
      p.startsWith("/boodschappen"),
    subNav: [
      { to: "/weekmenu", label: "Weekmenu" },
      { to: "/recepten", label: "Recepten" },
      { to: "/boodschappen", label: "Boodschappen" },
    ],
    standaardPad: "/weekmenu",
  },
  {
    key: "planning",
    label: "Planning",
    icon: CalendarClock,
    hoortBij: (p) => p.startsWith("/agenda") || p.startsWith("/klusjes"),
    subNav: [
      { to: "/agenda", label: "Agenda" },
      { to: "/klusjes", label: "Klusjes" },
    ],
    standaardPad: "/agenda",
  },
  {
    key: "gezin",
    label: "Gezin",
    icon: Users,
    hoortBij: (p) =>
      p.startsWith("/gezin") ||
      p.startsWith("/verlanglijst") ||
      p.startsWith("/fotos") ||
      p.startsWith("/prikbord") ||
      p.startsWith("/verjaardagen") ||
      p.startsWith("/klus-sjablonen"),
    subNav: [
      { to: "/gezin", label: "Gezin" },
      { to: "/prikbord", label: "Prikbord" },
      { to: "/fotos", label: "Foto's" },
      { to: "/verjaardagen", label: "Verjaardagen" },
      { to: "/verlanglijst", label: "Verlanglijst" },
      { to: "/klus-sjablonen", label: "Kluscatalogus" },
    ],
    standaardPad: "/gezin",
  },
];

export function sectieVoorPad(pathname: string): NavSectie | undefined {
  return NAV_SECTIES.find((s) => s.hoortBij(pathname));
}
