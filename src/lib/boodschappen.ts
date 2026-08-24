// Boodschappen-CRUD — RLS scoopt op gezin_id = current_gezin_id().
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BoodschappenItem = Tables<"boodschappen_items">;

export async function listBoodschappen() {
  const { data, error } = await supabase.from("boodschappen_items").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function addItem(gezinId: string, userId: string, naam: string) {
  const { data, error } = await supabase
    .from("boodschappen_items")
    .insert({ gezin_id: gezinId, naam, created_by: userId, bron_recept_id: null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleAfgevinkt(id: string, afgevinkt: boolean) {
  const { error } = await supabase.from("boodschappen_items").update({ afgevinkt }).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from("boodschappen_items").delete().eq("id", id);
  if (error) throw error;
}

export async function verwijderAfgevinkt() {
  const { error } = await supabase.from("boodschappen_items").delete().eq("afgevinkt", true);
  if (error) throw error;
}

// Haalt de ingrediënten op van elk gekoppeld recept in het weekmenu tussen
// startDatum en eindDatum, en voegt ze toe als boodschappen — met
// bron_recept_id zodat een herhaalde klik geen dubbels toevoegt.
export async function genereerVanWeekmenu(
  gezinId: string,
  userId: string,
  startDatum: string,
  eindDatum: string,
) {
  const { data: weekItems, error: weekError } = await supabase
    .from("weekmenu_items")
    .select("recept_id")
    .gte("datum", startDatum)
    .lte("datum", eindDatum)
    .not("recept_id", "is", null);
  if (weekError) throw weekError;

  const receptIds = [
    ...new Set((weekItems ?? []).map((w) => w.recept_id).filter((id): id is string => !!id)),
  ];
  if (receptIds.length === 0) return 0;

  const { data: recepten, error: receptenError } = await supabase
    .from("recepten")
    .select("id, ingredienten")
    .in("id", receptIds);
  if (receptenError) throw receptenError;

  const { data: bestaande, error: bestaandeError } = await supabase
    .from("boodschappen_items")
    .select("naam, bron_recept_id")
    .in("bron_recept_id", receptIds);
  if (bestaandeError) throw bestaandeError;

  const bestaandeSet = new Set((bestaande ?? []).map((b) => `${b.bron_recept_id}::${b.naam}`));

  const nieuweItems = (recepten ?? []).flatMap((r) =>
    r.ingredienten
      .filter((ingredient) => !bestaandeSet.has(`${r.id}::${ingredient}`))
      .map((ingredient) => ({
        gezin_id: gezinId,
        naam: ingredient,
        bron_recept_id: r.id,
        created_by: userId,
      })),
  );

  if (nieuweItems.length === 0) return 0;

  const { error: insertError } = await supabase.from("boodschappen_items").insert(nieuweItems);
  if (insertError) throw insertError;
  return nieuweItems.length;
}
