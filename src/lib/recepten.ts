// Recepten-CRUD — rechtstreeks tegen de recepten-tabel, want RLS scoopt al
// naar current_gezin_id() en er is geen extra client-side regel nodig zoals
// bij de gezin_id/rol-kolommen op profiles.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Ingredient = { naam: string; hoeveelheid: number | null; eenheid: string | null };

// ingredienten staat in de database als jsonb (kolomtype Json in de
// generated types) — hier vervangen door het sterker getypeerde
// Ingredient[] dat de rest van de app gebruikt.
export type Recept = Omit<Tables<"recepten">, "ingredienten"> & { ingredienten: Ingredient[] };

export type ReceptInvoer = {
  titel: string;
  beschrijving: string | null;
  bereidingstijd_minuten: number | null;
  porties: number | null;
  ingredienten: Ingredient[];
  instructies: string | null;
};

// jsonb komt terug als Json (unknown-achtig) — normaliseert defensief,
// zodat een onverwachte vorm (of oude data die de migratie miste) nooit
// een crash geeft, hoogstens een leeg ingrediënt.
export function naarIngredienten(ruw: unknown): Ingredient[] {
  if (!Array.isArray(ruw)) return [];
  return ruw.map((item) => {
    const obj = item as Record<string, unknown>;
    return {
      naam: typeof obj?.naam === "string" ? obj.naam : "",
      hoeveelheid: typeof obj?.hoeveelheid === "number" ? obj.hoeveelheid : null,
      eenheid: typeof obj?.eenheid === "string" ? obj.eenheid : null,
    };
  });
}

function naarRecept(row: Tables<"recepten">): Recept {
  return { ...row, ingredienten: naarIngredienten(row.ingredienten) };
}

export function formatteerIngredient(i: Ingredient): string {
  const delen = [i.hoeveelheid != null ? String(i.hoeveelheid) : null, i.eenheid, i.naam].filter(
    (d): d is string => !!d && d.trim() !== "",
  );
  return delen.join(" ");
}

// Schaalt de hoeveelheid mee met de portie-teller op het receptdetail.
// Rondt op 1 decimaal en toont geen overbodige ".0".
export function schaalHoeveelheid(hoeveelheid: number, ratio: number): number {
  return Math.round(hoeveelheid * ratio * 10) / 10;
}

export async function listRecepten() {
  const { data, error } = await supabase.from("recepten").select("*").order("titel");
  if (error) throw error;
  return (data ?? []).map(naarRecept);
}

export async function getRecept(id: string) {
  const { data, error } = await supabase.from("recepten").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? naarRecept(data) : null;
}

export async function createRecept(gezinId: string, userId: string, invoer: ReceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .insert({ ...invoer, gezin_id: gezinId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return naarRecept(data);
}

export async function updateRecept(id: string, invoer: ReceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .update(invoer)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return naarRecept(data);
}

export async function deleteRecept(id: string) {
  const { error } = await supabase.from("recepten").delete().eq("id", id);
  if (error) throw error;
}
