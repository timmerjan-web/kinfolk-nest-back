// Klusjes-CRUD — RLS scoopt op gezin_id = current_gezin_id().
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Klusje = Tables<"klusjes">;

export type KlusjeInvoer = {
  titel: string;
  deadline: string | null;
  toegewezen_aan: string | null;
};

export async function listKlusjes() {
  const { data, error } = await supabase
    .from("klusjes")
    .select("*")
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createKlusje(gezinId: string, userId: string, invoer: KlusjeInvoer) {
  const { data, error } = await supabase
    .from("klusjes")
    .insert({ ...invoer, gezin_id: gezinId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleAfgerond(id: string, afgerond: boolean, userId: string) {
  const { error } = await supabase
    .from("klusjes")
    .update({
      afgerond,
      afgerond_door: afgerond ? userId : null,
      afgerond_op: afgerond ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteKlusje(id: string) {
  const { error } = await supabase.from("klusjes").delete().eq("id", id);
  if (error) throw error;
}

// Formatteert een "YYYY-MM-DD"-datumstring zonder via Date-parsing te gaan
// (new Date("YYYY-MM-DD") parset als UTC-middernacht en kan een dag
// terugschuiven in tijdzones ten westen van UTC).
export function formatteerDeadline(datumString: string): string {
const [jaar, maand, dag] = datumString.split("-").map(Number) as [number, number, number];
  const datum = new Date(jaar, maand - 1, dag);
  return datum.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
