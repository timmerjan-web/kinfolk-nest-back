// Klusjes-CRUD — RLS scoopt op gezin_id = current_gezin_id().
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toDatumString } from "@/lib/weekmenu";

export type Klusje = Tables<"klusjes">;
export type Herhaling = "dagelijks" | "wekelijks" | "maandelijks";

export type KlusjeInvoer = {
  titel: string;
  deadline: string | null;
  deadline_tijd: string | null;
  toegewezen_aan: string | null;
  sjabloon_id: string | null;
  herhaling: Herhaling | null;
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

// Volgende datum voor een terugkerend klusje — telt vanaf de vorige
// deadline (of vandaag, als die er niet was) zodat de reeks niet
// verschuift door wanneer iemand toevallig afvinkt.
function volgendeHerhalingsdatum(herhaling: Herhaling, huidigeDeadline: string | null): string {
  const basis = huidigeDeadline ? new Date(`${huidigeDeadline}T00:00:00`) : new Date();
  if (herhaling === "dagelijks") basis.setDate(basis.getDate() + 1);
  else if (herhaling === "wekelijks") basis.setDate(basis.getDate() + 7);
  else if (herhaling === "maandelijks") basis.setMonth(basis.getMonth() + 1);
  return toDatumString(basis);
}

// Vinkt een klusje af (of terug open). Bij het afvinken wordt de
// voltooiing altijd als los feit gelogd (klus_voltooiingen) — de
// geschiedenis waarop een eventuele ranglijst later kan bouwen.
// Terugkerende klusjes (herhaling gezet) blijven daarna niet
// "afgerond" staan, maar resetten meteen met een nieuwe deadline.
export async function toggleAfgerond(
  klusje: Klusje,
  afgerond: boolean,
  gezinId: string,
  userId: string,
) {
  if (afgerond) {
    const { error: logError } = await supabase.from("klus_voltooiingen").insert({
      gezin_id: gezinId,
      klusje_id: klusje.id,
      sjabloon_id: klusje.sjabloon_id,
      toegewezen_aan: userId,
    });
    if (logError) throw logError;
  }

  if (afgerond && klusje.herhaling) {
    const volgendeDeadline = volgendeHerhalingsdatum(
      klusje.herhaling as Herhaling,
      klusje.deadline,
    );
    const { error } = await supabase
      .from("klusjes")
      .update({
        afgerond: false,
        afgerond_door: null,
        afgerond_op: null,
        deadline: volgendeDeadline,
      })
      .eq("id", klusje.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("klusjes")
    .update({
      afgerond,
      afgerond_door: afgerond ? userId : null,
      afgerond_op: afgerond ? new Date().toISOString() : null,
    })
    .eq("id", klusje.id);
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

// Postgres geeft een time-kolom terug als "HH:MM:SS" — voor weergave
// zijn de seconden niet relevant.
export function formatteerTijd(tijdString: string): string {
  return tijdString.slice(0, 5);
}
