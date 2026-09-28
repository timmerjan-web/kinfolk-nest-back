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

export async function haalIvagoKlusjeAanmaken(gezinId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("gezinnen")
    .select("ivago_klusje_aanmaken")
    .eq("id", gezinId)
    .maybeSingle();
  if (error) throw error;
  return data?.ivago_klusje_aanmaken ?? false;
}

export async function zetIvagoKlusjeAanmaken(gezinId: string, aan: boolean): Promise<void> {
  const { error } = await supabase
    .from("gezinnen")
    .update({ ivago_klusje_aanmaken: aan })
    .eq("id", gezinId);
  if (error) throw error;
}

// Ophalingen binnen een periode voor de ingestelde ronde — voor de
// inline weergave op de Agenda-pagina (naast eigen/externe afspraken).
export async function haalOphalingen(
  ronde: string,
  vanafStr: string,
  totStr: string,
): Promise<WasteCollection[]> {
  const { data, error } = await supabase
    .from("waste_collections")
    .select("*")
    .eq("ronde", ronde)
    .gte("datum", vanafStr)
    .lte("datum", totStr)
    .order("datum", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Leesbare fractielijst, bv. "GFT, papier en PMD" — zelfde labels als
// de ivago-melden Edge Function, hier client-side voor de weergave.
const FRACTIE_LABELS: Record<string, string> = { gft: "GFT", pmd: "PMD" };
export function formatteerFracties(fracties: string[]): string {
  const labels = fracties.map((f) => FRACTIE_LABELS[f] ?? f.charAt(0).toUpperCase() + f.slice(1));
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} en ${labels[labels.length - 1]}`;
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
