// Verlanglijst-CRUD. gebruiker_id = van wie de wens is (persoonlijk
// bezit qua toevoegen/verwijderen), maar "gekocht" afvinken mag elk
// gezinslid — geen verrassingsmechanisme, iedereen ziet alles.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type VerlanglijstItem = Tables<"verlanglijst_items">;

export type VerlanglijstInvoer = {
  titel: string;
  url: string | null;
  prijs: number | null;
  notitie: string | null;
};

export async function listVerlanglijst(gebruikerId: string) {
  const { data, error } = await supabase
    .from("verlanglijst_items")
    .select("*")
    .eq("gebruiker_id", gebruikerId)
    .order("gekocht", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createVerlanglijstItem(
  gezinId: string,
  gebruikerId: string,
  invoer: VerlanglijstInvoer,
) {
  const { data, error } = await supabase
    .from("verlanglijst_items")
    .insert({ ...invoer, gezin_id: gezinId, gebruiker_id: gebruikerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleGekocht(id: string, gekocht: boolean, userId: string) {
  const { error } = await supabase
    .from("verlanglijst_items")
    .update({ gekocht, gekocht_door: gekocht ? userId : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVerlanglijstItem(id: string) {
  const { error } = await supabase.from("verlanglijst_items").delete().eq("id", id);
  if (error) throw error;
}
