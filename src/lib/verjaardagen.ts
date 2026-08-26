// Verjaardagen — maand/dag telt, jaartal van geboortedatum wordt genegeerd
// bij het bepalen of iemands verjaardag binnen een marge valt.
function volgendeVerjaardag(geboortedatum: string, vandaag: Date): Date {
  const [, maandStr, dagStr] = geboortedatum.split("-");
  const maand = Number(maandStr) - 1;
  const dag = Number(dagStr);
  const vandaagMidnight = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());
  let volgende = new Date(vandaag.getFullYear(), maand, dag);
  if (volgende < vandaagMidnight) {
    volgende = new Date(vandaag.getFullYear() + 1, maand, dag);
  }
  return volgende;
}

export function dagenTotVerjaardag(geboortedatum: string, vandaag: Date): number {
  const vandaagMidnight = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());
  const volgende = volgendeVerjaardag(geboortedatum, vandaag);
  return Math.round((volgende.getTime() - vandaagMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatteerVerjaardag(geboortedatum: string): string {
  const [, maandStr, dagStr] = geboortedatum.split("-");
  const maand = Number(maandStr) - 1;
  const dag = Number(dagStr);
  const datum = new Date(2000, maand, dag);
  return datum.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

// Leeftijd die iemand wordt bij de eerstvolgende verjaardag — alleen
// zinvol als het geboortejaar bekend is (optioneel veld bij
// contacten buiten het gezin).
export function volgendeLeeftijd(
  geboortejaar: number,
  geboortedatum: string,
  vandaag: Date,
): number {
  return volgendeVerjaardag(geboortedatum, vandaag).getFullYear() - geboortejaar;
}
