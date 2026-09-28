// Onthoudt, per navigatiesectie, het laatst bezochte pad en de
// scrollpositie per pad — sessionStorage (niet localStorage): hoeft niet
// tussen installaties/apparaten te overleven, en session-scope voorkomt
// dat een oude scrollpositie na een update blijft hangen. Alle functies
// falen stil als sessionStorage geblokkeerd is (privénavigatie) — dan
// valt een sectie gewoon terug op zijn standaardpad, en start elke
// pagina bovenaan.
const PREFIX = "gezinsapp:nav:";

export function onthoudLaatstePad(sectie: string, pad: string) {
  try {
    sessionStorage.setItem(`${PREFIX}laatste:${sectie}`, pad);
  } catch {
    // negeer
  }
}

export function laatstePad(sectie: string): string | null {
  try {
    return sessionStorage.getItem(`${PREFIX}laatste:${sectie}`);
  } catch {
    return null;
  }
}

export function onthoudScroll(pad: string, y: number) {
  try {
    sessionStorage.setItem(`${PREFIX}scroll:${pad}`, String(y));
  } catch {
    // negeer
  }
}

export function haalScroll(pad: string): number {
  try {
    const waarde = sessionStorage.getItem(`${PREFIX}scroll:${pad}`);
    return waarde ? Number(waarde) : 0;
  } catch {
    return 0;
  }
}
