// IVAGO-afvalophaalkalender — leest/schrijft alleen de eigen Supabase-
// tabellen (waste_collections, waste_calendar_status, gezinnen.ivago_ronde).
// Het ophalen bij data.stad.gent zelf gebeurt uitsluitend server-side,
// in de ivago-refresh Edge Function.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WasteCollection = Tables<"waste_collections">;
export type WasteCalendarStatus = Tables<"waste_calendar_status">;

export async function haalIvagoRonde(gezinId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("gezinnen")
    .select("ivago_ronde")
    .eq("id", gezinId)
    .maybeSingle();
  if (error) throw error;
  return data?.ivago_ronde ?? null;
}

export async function zetIvagoRonde(gezinId: string, ronde: string | null): Promise<void> {
  const { error } = await supabase
    .from("gezinnen")
    .update({ ivago_ronde: ronde })
    .eq("id", gezinId);
  if (error) throw error;
}

// Eerstvolgende ophaling vanaf (incl.) vandaag, voor de ingestelde ronde.
export async function volgendeOphaling(ronde: string): Promise<WasteCollection | null> {
  const vandaag = new Date();
  const vandaagStr = `${vandaag.getFullYear()}-${String(vandaag.getMonth() + 1).padStart(2, "0")}-${String(vandaag.getDate()).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("waste_collections")
    .select("*")
    .eq("ronde", ronde)
    .gte("datum", vandaagStr)
    .order("datum", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Meest recente verversingspoging, ongeacht dataset-id — robuust
// tegen een dataset-id-wissel (valkuil 2), de UI wil gewoon weten
// "wanneer lukte het voor het laatst".
export async function haalKalenderStatus(): Promise<WasteCalendarStatus | null> {
  const { data, error } = await supabase
    .from("waste_calendar_status")
    .select("*")
    .order("laatste_poging_op", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
