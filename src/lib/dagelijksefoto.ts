// Dagelijkse foto — één per gezinslid per dag, in een private Storage-
// bucket. De "post to see"-gating (anderen zie je pas als je zelf ook
// vandaag geplaatst hebt) zit in de SELECT-policy op de tabel zelf, niet
// hier — dus wat listFotosVoorDatum() teruggeeft is al correct gefilterd.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toDatumString } from "@/lib/weekmenu";
import { verkleinAfbeelding } from "@/lib/afbeelding";

export type DagelijkseFoto = Tables<"dagelijkse_fotos">;

const BUCKET = "dagelijkse-fotos";

export async function uploadFotoVanVandaag(
  gezinId: string,
  userId: string,
  datum: string,
  bestand: File,
) {
  const verkleind = await verkleinAfbeelding(bestand);
  const pad = `${gezinId}/${userId}/${datum}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(pad, verkleind, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("dagelijkse_fotos")
    .upsert(
      { gezin_id: gezinId, gebruiker_id: userId, datum, storage_pad: pad },
      { onConflict: "gebruiker_id,datum" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listFotosVoorDatum(datum: string) {
  const { data, error } = await supabase.from("dagelijkse_fotos").select("*").eq("datum", datum);
  if (error) throw error;
  return data;
}

export async function listEigenFotos(userId: string) {
  const { data, error } = await supabase
    .from("dagelijkse_fotos")
    .select("*")
    .eq("gebruiker_id", userId)
    .order("datum", { ascending: false });
  if (error) throw error;
  return data;
}

export async function signedUrl(pad: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pad, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

// Aantal opeenvolgende dagen (t/m vandaag of gisteren) met een geplaatste
// foto. datums moet aflopend gesorteerd zijn (nieuwste eerst).
export function berekenStreak(datums: string[]): number {
  if (datums.length === 0) return 0;

  const vandaag = new Date();
  const vandaagStr = toDatumString(vandaag);
  const gisteren = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate() - 1);
  const gisterenStr = toDatumString(gisteren);

  let cursor: Date | null = null;
  if (datums[0] === vandaagStr) cursor = vandaag;
  else if (datums[0] === gisterenStr) cursor = gisteren;
  if (!cursor) return 0;

  let streak = 0;
  for (const d of datums) {
    if (d === toDatumString(cursor)) {
      streak++;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
