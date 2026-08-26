// Verjaardagenkalender voor vrienden & familie buiten het gezin —
// gedeelde gezinsresource, zelfde collaboratieve RLS als recepten/
// klusjes/agenda/prikbord.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type VerjaardagContact = Tables<"verjaardagen">;

export type VerjaardagInvoer = {
  naam: string;
  maand: number; // 1-12
  dag: number; // 1-31
  geboortejaar: number | null;
};

function naarGeboortedatum(maand: number, dag: number): string {
  return `2000-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

export async function listVerjaardagen() {
  const { data, error } = await supabase.from("verjaardagen").select("*").order("naam");
  if (error) throw error;
  return data;
}

export async function createVerjaardag(gezinId: string, userId: string, invoer: VerjaardagInvoer) {
  const { data, error } = await supabase
    .from("verjaardagen")
    .insert({
      gezin_id: gezinId,
      created_by: userId,
      naam: invoer.naam,
      geboortedatum: naarGeboortedatum(invoer.maand, invoer.dag),
      geboortejaar: invoer.geboortejaar,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVerjaardag(id: string, invoer: VerjaardagInvoer) {
  const { data, error } = await supabase
    .from("verjaardagen")
    .update({
      naam: invoer.naam,
      geboortedatum: naarGeboortedatum(invoer.maand, invoer.dag),
      geboortejaar: invoer.geboortejaar,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVerjaardag(id: string) {
  const { error } = await supabase.from("verjaardagen").delete().eq("id", id);
  if (error) throw error;
}
