// Klus-sjablonen-CRUD (Fase A) — gedeelde gezinsresource, maar
// beheren (insert/update/delete) is via RLS beperkt tot ouders.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type KlusSjabloon = Tables<"klus_sjablonen">;

export type KlusSjabloonInvoer = {
  titel: string;
  icoon: string;
};

export async function listKlusSjablonen() {
  const { data, error } = await supabase.from("klus_sjablonen").select("*").order("titel");
  if (error) throw error;
  return data;
}

export async function createKlusSjabloon(
  gezinId: string,
  userId: string,
  invoer: KlusSjabloonInvoer,
) {
  const { data, error } = await supabase
    .from("klus_sjablonen")
    .insert({ gezin_id: gezinId, created_by: userId, titel: invoer.titel, icoon: invoer.icoon })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKlusSjabloon(id: string, invoer: KlusSjabloonInvoer) {
  const { data, error } = await supabase
    .from("klus_sjablonen")
    .update({ titel: invoer.titel, icoon: invoer.icoon })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKlusSjabloon(id: string) {
  const { error } = await supabase.from("klus_sjablonen").delete().eq("id", id);
  if (error) throw error;
}
