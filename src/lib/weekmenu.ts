// Weekmenu-CRUD — dag-voor-dag; RLS scoopt op gezin_id = current_gezin_id().
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WeekmenuItem = Tables<"weekmenu_items">;

export type WeekmenuInvoer = {
  titel: string;
  recept_id: string | null;
  kok: string | null;
  notitie: string | null;
};

export async function listWeek(startDatum: string, eindDatum: string) {
  const { data, error } = await supabase
    .from("weekmenu_items")
    .select("*")
    .gte("datum", startDatum)
    .lte("datum", eindDatum);
  if (error) throw error;
  return data;
}

export async function getDag(datum: string) {
  const { data, error } = await supabase
    .from("weekmenu_items")
    .select("*")
    .eq("datum", datum)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDag(
  gezinId: string,
  userId: string,
  datum: string,
  invoer: WeekmenuInvoer,
) {
  const { data, error } = await supabase
    .from("weekmenu_items")
    .insert({ ...invoer, gezin_id: gezinId, datum, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDag(id: string, invoer: WeekmenuInvoer) {
  const { data, error } = await supabase
    .from("weekmenu_items")
    .update(invoer)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDag(id: string) {
  const { error } = await supabase.from("weekmenu_items").delete().eq("id", id);
  if (error) throw error;
}

// -- Datumhelpers (lokale tijd, geen UTC-shift zoals toISOString geeft) --

export function startOfWeek(d: Date): Date {
  const dag = d.getDay(); // 0 = zondag
  const verschil = (dag === 0 ? -6 : 1) - dag;
  const maandag = new Date(d);
  maandag.setDate(d.getDate() + verschil);
  maandag.setHours(0, 0, 0, 0);
  return maandag;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function toDatumString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dag}`;
}

export function isVandaag(d: Date): boolean {
  return toDatumString(d) === toDatumString(new Date());
}
