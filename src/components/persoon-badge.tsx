import { kleurVoorPersoon } from "@/lib/persoon";

// Kleine gekleurde initiaal-badge per gezinslid — consistente,
// makkelijker te scannen manier om "van wie is dit" te tonen dan een
// kale naam in grijze tekst of een piepklein stipje.
export function PersoonBadge({
  naam,
  gebruikerId,
  className = "",
}: {
  naam: string;
  gebruikerId: string;
  className?: string;
}) {
  const initiaal = naam.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      title={naam}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${kleurVoorPersoon(gebruikerId)} ${className}`}
    >
      {initiaal}
    </span>
  );
}
