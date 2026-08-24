// Recepten-CRUD — rechtstreeks tegen de recepten-tabel, want RLS scoopt al
// naar current_gezin_id() en er is geen extra client-side regel nodig zoals
// bij de gezin_id/rol-kolommen op profiles.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Recept = Tables<"recepten">;

export type ReceptInvoer = {
  titel: string;
  beschrijving: string | null;
  bereidingstijd_minuten: number | null;
  porties: number | null;
  ingredienten: string[];
  instructies: string | null;
};

export async function listRecepten() {
  const { data, error } = await supabase
    .from("recepten")
    .select("*")
    .order("titel");
  if (error) throw error;
  return data;
}

export async function getRecept(id: string) {
  const { data, error } = await supabase.from("recepten").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createRecept(gezinId: string, userId: string, invoer: ReceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .insert({ ...invoer, gezin_id: gezinId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecept(id: string, invoer: ReceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .update(invoer)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecept(id: string) {
  const { error } = await supabase.from("recepten").delete().eq("id", id);
  if (error) throw error;
}
