// Koppelen van externe agenda's (Google Calendar/Outlook/Apple, via
// de geheime iCal-URL) en het ophalen van de daaruit voortkomende
// afspraken via de agenda-ics-proxy Edge Function — nodig omdat
// browsers die iCal-URL's niet rechtstreeks mogen ophalen (CORS).
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AgendaKoppeling = Tables<"agenda_koppelingen">;

export type ExterneAfspraak = {
  titel: string;
  start: string;
  eind: string;
  heleDag: boolean;
};

export type ExterneAgendaResultaat = {
  gebruiker_id: string;
  naam: string;
  label: string | null;
  afspraken: ExterneAfspraak[];
  fout: string | null;
};

export async function listEigenKoppelingen(userId: string) {
  const { data, error } = await supabase
    .from("agenda_koppelingen")
    .select("*")
    .eq("gebruiker_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function koppelAgenda(
  gezinId: string,
  userId: string,
  icalUrl: string,
  label: string,
) {
  const { data, error } = await supabase
    .from("agenda_koppelingen")
    .insert({ gezin_id: gezinId, gebruiker_id: userId, ical_url: icalUrl, label: label || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function ontkoppelAgenda(id: string) {
  const { error } = await supabase.from("agenda_koppelingen").delete().eq("id", id);
  if (error) throw error;
}

export async function haalExterneAfspraken(): Promise<ExterneAgendaResultaat[]> {
  const { data, error } = await supabase.functions.invoke<{
    resultaten?: ExterneAgendaResultaat[];
    error?: string;
  }>("agenda-ics-proxy");
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.resultaten ?? [];
}
