// Client-side afbeelding-compressie, gedeeld door alle foto-uploads
// (dagelijkse foto, prikbord) — voorkomt dat onbewerkte telefoonfoto's
// (vaak meerdere MB) storage/laadtijd onnodig belasten.
export async function verkleinAfbeelding(
  bestand: File,
  maxAfmeting = 1600,
  kwaliteit = 0.8,
): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(bestand);
  } catch {
    throw new Error(
      "Deze foto kon niet worden geopend. Waarschijnlijk een HEIC-bestand (typisch bij iPhone) " +
        "dat deze browser niet leest — kies een JPEG of PNG, of zet op je iPhone onder " +
        "Instellingen > Camera > Formaten 'Meest compatibel' aan.",
    );
  }
  const schaal = Math.min(1, maxAfmeting / Math.max(bitmap.width, bitmap.height));
  const breedte = Math.round(bitmap.width * schaal);
  const hoogte = Math.round(bitmap.height * schaal);
  const canvas = document.createElement("canvas");
  canvas.width = breedte;
  canvas.height = hoogte;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas wordt niet ondersteund in deze browser.");
  ctx.drawImage(bitmap, 0, 0, breedte, hoogte);
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Foto comprimeren mislukt."))),
      "image/jpeg",
      kwaliteit,
    );
  });
}
