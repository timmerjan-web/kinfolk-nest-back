// Household-acties — lopen altijd via SECURITY DEFINER RPC's (nooit een
// rechtstreekse update van profiles.gezin_id/rol vanuit de client), zodat een
// gebruiker zichzelf niet in een ander gezin of een hogere rol kan zetten.
// Zie supabase/migrations/*_fundament*.sql.
import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "./auth";

export async function maakGezinAan(naam: string) {
  const { data, error } = await supabase.rpc("gezin_aanmaken", { p_naam: naam });
  if (error) throw error;
  return data;
}

export async function maakUitnodigingAan(rol: Rol) {
  const { data, error } = await supabase.rpc("gezin_uitnodiging_aanmaken", { p_rol: rol });
  if (error) throw error;
  return data;
}

export async function wordGezinslid(code: string) {
  const { error } = await supabase.rpc("gezin_lid_worden", { p_code: code });
  if (error) throw error;
}
