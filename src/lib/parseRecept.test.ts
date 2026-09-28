import { describe, expect, it } from "vitest";
import { parseRecept } from "./parseRecept";

describe("parseRecept", () => {
  it("herkent kopjes, opsommingstekens, nummering, hashtags en een link", () => {
    const bijschrift = `Romige pastasaus met spinazie 🍝
Heerlijk voor 4 personen, 25 min klaar!

Ingrediënten:
• 300 g pasta
• 200 g spinazie
- 1 teentje knoflook
* 100 ml room

Bereiding:
1. Kook de pasta volgens de verpakking.
2) Fruit de knoflook kort aan.
3. Voeg de spinazie en room toe en laat inkoken.

#pasta #snel #vegetarisch
https://www.instagram.com/reel/abc123/`;

    const resultaat = parseRecept(bijschrift);

    expect(resultaat.titel).toBe("Romige pastasaus met spinazie 🍝");
    expect(resultaat.porties).toBe(4);
    expect(resultaat.tijd_min).toBe(25);
    expect(resultaat.ingredienten).toEqual([
      "300 g pasta",
      "200 g spinazie",
      "1 teentje knoflook",
      "100 ml room",
    ]);
    expect(resultaat.bereiding).toEqual([
      "Kook de pasta volgens de verpakking.",
      "Fruit de knoflook kort aan.",
      "Voeg de spinazie en room toe en laat inkoken.",
    ]);
    expect(resultaat.url).toBe("https://www.instagram.com/reel/abc123/");
    expect(resultaat.categorie).toBe("");
    expect(resultaat.tags).toEqual([]);
  });

  it("herkent 'uur'-tijdsnotatie en 'nodig'/'werkwijze' als alternatieve kopjes", () => {
    const bijschrift = `Stoofpotje voor de zondag
Voor 6 personen, bereidingstijd 1 uur 15

Nodig:
- 800 g runderlappen
- 2 uien
- 3 laurierblaadjes

Werkwijze:
1. Snijd het vlees in blokjes.
2. Laat 1 uur 15 sudderen op laag vuur.

#stoofpotje #wintereten`;

    const resultaat = parseRecept(bijschrift);

    expect(resultaat.titel).toBe("Stoofpotje voor de zondag");
    expect(resultaat.porties).toBe(6);
    expect(resultaat.tijd_min).toBe(75);
    expect(resultaat.ingredienten).toEqual(["800 g runderlappen", "2 uien", "3 laurierblaadjes"]);
    expect(resultaat.bereiding).toEqual([
      "Snijd het vlees in blokjes.",
      "Laat 1 uur 15 sudderen op laag vuur.",
    ]);
    expect(resultaat.url).toBeNull();
  });

  it("verzint niets als er geen herkenbare kopjes zijn — ingrediënten en bereiding blijven leeg", () => {
    const bijschrift = `Vanavond weer heerlijk gegeten bij oma 😋
Recept volgt nog een keertje!
#lekker #familie`;

    const resultaat = parseRecept(bijschrift);

    expect(resultaat.titel).toBe("Vanavond weer heerlijk gegeten bij oma 😋");
    expect(resultaat.ingredienten).toEqual([]);
    expect(resultaat.bereiding).toEqual([]);
    expect(resultaat.porties).toBeNull();
    expect(resultaat.tijd_min).toBeNull();
    expect(resultaat.url).toBeNull();
  });

  it("herkent kopjes ook met emoji of andere versiering eromheen, maar niet als onderdeel van een gewone zin", () => {
    const bijschrift = `Kip teriyaki bowl 🍜

🛒 Ingrediënten 👇
- 2 kipfilets
- rijst
- teriyakisaus

👩‍🍳 BEREIDING:
1. Kip bakken
2. Rijst koken

Ingrediënten voor de saus vind je in mijn stories
#lekker #snel`;

    const resultaat = parseRecept(bijschrift);

    expect(resultaat.titel).toBe("Kip teriyaki bowl 🍜");
    expect(resultaat.ingredienten).toEqual(["2 kipfilets", "rijst", "teriyakisaus"]);
    expect(resultaat.bereiding).toEqual([
      "Kip bakken",
      "Rijst koken",
      "Ingrediënten voor de saus vind je in mijn stories",
    ]);
  });

  it("vangt een kale opsomming (geen 'Ingrediënten'/'Bereiding'-kopje) op als bereidingsstappen", () => {
    // Uit een echt Instagram-bijschrift: begint meteen met bullets, geen
    // aparte ingrediëntensectie — de ingrediënten zitten verweven in de
    // stappen zelf (peper, zout, knoflookpoeder, …) en blijven dus terecht
    // leeg. De afsluitende losse zin ("Smakelijk!!!") hoort niet bij de
    // stappen en wordt niet meegenomen.
    const bijschrift = `Kruidige aardappeltjes uit de oven

- Was de aardappelen met schil.
- Snij in partjes
- Kook de partjes aardappel een 5-6 tal minuten
- Giet ze af in een vergiet..
- Kruid de aardappeltjes goed met peper, zout, knoflookpoeder, paprikapoeder, tijm, rozemarijn.
- Leg ze naast elkaar op een bakplaat, ongeveer 25-30 minuten.
- Schep tussen door de patatjes eens om.

Smakelijk!!!`;

    const resultaat = parseRecept(bijschrift);

    expect(resultaat.titel).toBe("Kruidige aardappeltjes uit de oven");
    expect(resultaat.ingredienten).toEqual([]);
    expect(resultaat.bereiding).toEqual([
      "Was de aardappelen met schil.",
      "Snij in partjes",
      "Kook de partjes aardappel een 5-6 tal minuten",
      "Giet ze af in een vergiet..",
      "Kruid de aardappeltjes goed met peper, zout, knoflookpoeder, paprikapoeder, tijm, rozemarijn.",
      "Leg ze naast elkaar op een bakplaat, ongeveer 25-30 minuten.",
      "Schep tussen door de patatjes eens om.",
    ]);
    expect(resultaat.tijd_min).toBe(30);
  });
});
