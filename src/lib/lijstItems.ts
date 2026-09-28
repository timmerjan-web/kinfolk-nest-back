// Kijk-/leeslijst-CRUD. gebruiker_id = van wie het lijstje is
// (persoonlijk bezit qua toevoegen/verwijderen), maar "afgerond"
// afvinken mag elk gezinslid — zelfde patroon als verlanglijst.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type LijstItem = Tables<"lijst_items">;
export type LijstSoort = "kijken" | "lezen";

export type LijstItemInvoer = {
  soort: LijstSoort;
  titel: string;
  notitie: string | null;
};

export async function listLijstItems(gebruikerId: string, soort: LijstSoort) {
  const { data, error } = await supabase
    .from("lijst_items")
    .select("*")
    .eq("gebruiker_id", gebruikerId)
    .eq("soort", soort)
    .order("afgerond", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createLijstItem(
  gezinId: string,
  gebruikerId: string,
  invoer: LijstItemInvoer,
) {
  const { data, error } = await supabase
    .from("lijst_items")
    .insert({ ...invoer, gezin_id: gezinId, gebruiker_id: gebruikerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleAfgerond(id: string, afgerond: boolean, userId: string) {
  const { error } = await supabase
    .from("lijst_items")
    .update({ afgerond, afgerond_door: afgerond ? userId : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLijstItem(id: string) {
  const { error } = await supabase.from("lijst_items").delete().eq("id", id);
  if (error) throw error;
}

// Zet een verwijderd item terug — gebruikt door de "Ongedaan maken"-actie
// op de undo-toast.
export async function herstelLijstItem(item: LijstItem) {
  const { error } = await supabase.from("lijst_items").insert(item);
  if (error) throw error;
}
