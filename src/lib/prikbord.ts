// Prikbord-CRUD — gedeelde gezinsresource (zelfde collaboratieve RLS als
// recepten/klusjes/agenda), niet persoonlijk zoals dagelijkse_fotos.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { verkleinAfbeelding } from "@/lib/afbeelding";

export type PrikbordItem = Tables<"prikbord_items">;

const BUCKET = "prikbord-fotos";

export async function listPrikbord() {
  const { data, error } = await supabase
    .from("prikbord_items")
    .select("*")
    .order("vastgepind", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPrikbordItem(
  gezinId: string,
  userId: string,
  tekst: string,
  tags: string[],
  foto: File | null,
) {
  const id = crypto.randomUUID();
  let storagePad: string | null = null;

  if (foto) {
    const verkleind = await verkleinAfbeelding(foto);
    storagePad = `${gezinId}/${id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePad, verkleind, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
  }

  const { data, error } = await supabase
    .from("prikbord_items")
    .insert({ id, gezin_id: gezinId, created_by: userId, tekst, tags, storage_pad: storagePad })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePrikbordItem(
  item: PrikbordItem,
  tekst: string,
  tags: string[],
  fotoVerwijderen: boolean,
) {
  let storagePad = item.storage_pad;
  if (fotoVerwijderen && item.storage_pad) {
    await supabase.storage.from(BUCKET).remove([item.storage_pad]);
    storagePad = null;
  }
  const { data, error } = await supabase
    .from("prikbord_items")
    .update({ tekst, tags, storage_pad: storagePad })
    .eq("id", item.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function togglePin(id: string, vastgepind: boolean) {
  const { error } = await supabase.from("prikbord_items").update({ vastgepind }).eq("id", id);
  if (error) throw error;
}

export async function deletePrikbordItem(item: PrikbordItem) {
  if (item.storage_pad) {
    await supabase.storage.from(BUCKET).remove([item.storage_pad]);
  }
  const { error } = await supabase.from("prikbord_items").delete().eq("id", item.id);
  if (error) throw error;
}

export async function signedUrl(pad: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pad, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
