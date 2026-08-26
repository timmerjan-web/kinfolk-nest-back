// Agenda-CRUD — RLS scoopt op gezin_id = current_gezin_id().
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AgendaItem = Tables<"agenda_items">;

export type AgendaInvoer = {
  titel: string;
  datum: string;
  tijd: string | null;
  notitie: string | null;
};

export async function listAgenda() {
  const { data, error } = await supabase
    .from("agenda_items")
    .select("*")
    .order("datum", { ascending: true })
    .order("tijd", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createAgendaItem(gezinId: string, userId: string, invoer: AgendaInvoer) {
  const { data, error } = await supabase
    .from("agenda_items")
    .insert({ ...invoer, gezin_id: gezinId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgendaItem(id: string) {
  const { error } = await supabase.from("agenda_items").delete().eq("id", id);
  if (error) throw error;
}

// Formatteert een "YYYY-MM-DD"-datumstring zonder via Date-parsing te gaan
// (new Date("YYYY-MM-DD") parset als UTC-middernacht en kan een dag
// terugschuiven in tijdzones ten westen van UTC).
export function formatteerDatum(datumString: string): string {
const [jaar, maand, dag] = datumString.split("-").map(Number) as [number, number, number];
  const datum = new Date(jaar, maand - 1, dag);
  return datum.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

// Postgres time komt terug als "HH:MM:SS" — toon alleen uren:minuten.
export function formatteerTijd(tijdString: string): string {
  return tijdString.slice(0, 5);
}
