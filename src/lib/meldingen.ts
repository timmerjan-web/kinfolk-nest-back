// In-app meldingen — persoonlijk bezit, alleen de ontvanger ziet/
// beheert zijn eigen meldingen. Wordt gevuld door een database-
// trigger op klusjes (klusje_toewijzing_melden), niet vanuit hier.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Melding = Tables<"meldingen">;

export async function listMeldingen() {
  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

export async function markeerGelezen(id: string) {
  const { error } = await supabase.from("meldingen").update({ gelezen: true }).eq("id", id);
  if (error) throw error;
}

export async function markeerAllesGelezen(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase.from("meldingen").update({ gelezen: true }).in("id", ids);
  if (error) throw error;
}

export function meldingTekst(melding: Melding): string {
  const payload = melding.payload as { titel?: string; door?: string } | null;
  if (melding.type === "klusje_toegewezen") {
    return `Je bent ingedeeld voor "${payload?.titel ?? "een klusje"}"`;
  }
  if (melding.type === "klusje_voltooid") {
    const titel = payload?.titel ?? "een klusje";
    return payload?.door
      ? `${payload.door} heeft "${titel}" afgerond`
      : `"${titel}" is afgerond`;
  }
  return "Nieuwe melding";
}
