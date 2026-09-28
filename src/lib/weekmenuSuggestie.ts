// Vraagt een AI-weekmenusuggestie op bij de weekmenu-suggestie Edge
// Function (roept zelf, server-side, de Claude API aan — zie die functie
// voor het waarom). Gooit door bij een fout, inclusief de eigenlijke
// foutmelding die de functie als JSON teruggeeft: supabase-js verstopt
// die bij een niet-2xx-respons achter error.context (net als bij
// agenda-ics-proxy in externeAgenda.ts).
import { supabase } from "@/integrations/supabase/client";

export type WeekmenuVoorstel = { datum: string; recept_id: string; titel: string };

async function leesFunctieFout(error: unknown): Promise<string | null> {
  if (
    error &&
    typeof error === "object" &&
    "context" in error &&
    error.context instanceof Response
  ) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // geen JSON-body — val terug op de generieke foutmelding
    }
  }
  return null;
}

export async function vraagWeekmenuSuggestieAan(weekStart: string): Promise<WeekmenuVoorstel[]> {
  const { data, error } = await supabase.functions.invoke<{
    voorstellen?: WeekmenuVoorstel[];
    error?: string;
  }>("weekmenu-suggestie", { body: { week_start: weekStart } });
  if (error) {
    const detail = await leesFunctieFout(error);
    throw new Error(detail ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data?.voorstellen ?? [];
}
