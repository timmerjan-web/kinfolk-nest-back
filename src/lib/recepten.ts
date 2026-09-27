// Recepten-CRUD — rechtstreeks tegen de recepten-tabel, want RLS scoopt al
// naar current_gezin_id() en er is geen extra client-side regel nodig zoals
// bij de gezin_id/rol-kolommen op profiles.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Recept = Tables<"recepten">;

// Vrije-tekst-lijst i.p.v. een vaste set: nieuwe categorieën toevoegen
// (Nagerecht, …) is dus enkel deze lijst uitbreiden, geen migratie.
export const RECEPT_CATEGORIEEN = ["ontbijt", "lunch", "maaltijd"] as const;
export const STANDAARD_CATEGORIE: (typeof RECEPT_CATEGORIEEN)[number] = "maaltijd";

export function categorieLabel(categorie: string): string {
  return categorie.charAt(0).toUpperCase() + categorie.slice(1);
}

export type ReceptInvoer = {
  titel: string;
  categorie: string;
  beschrijving: string | null;
  bereidingstijd_minuten: number | null;
  porties: number | null;
  ingredienten: string[];
  stappen: string[];
  tags: string[];
  recept_url: string | null;
};

export async function listRecepten() {
  const { data, error } = await supabase
    .from("recepten")
    .select("*")
    .eq("status", "definitief")
    .order("titel");
  if (error) throw error;
  return data;
}

// Concept-wachtrij (gedeeld vanuit Instagram, nog niet nagekeken) —
// nieuwste eerst, los van de normale receptenlijst hierboven.
export async function listConceptRecepten() {
  const { data, error } = await supabase
    .from("recepten")
    .select("*")
    .eq("status", "concept")
    .order("toegevoegd_op", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRecept(id: string) {
  const { data, error } = await supabase.from("recepten").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createRecept(gezinId: string, userId: string, invoer: ReceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .insert({ ...invoer, gezin_id: gezinId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Bulk-insert voor de Excel-import — één round-trip voor alle rijen i.p.v.
// createRecept in een lus.
export async function createRecepten(gezinId: string, userId: string, invoerLijst: ReceptInvoer[]) {
  if (invoerLijst.length === 0) return [];
  const { data, error } = await supabase
    .from("recepten")
    .insert(invoerLijst.map((invoer) => ({ ...invoer, gezin_id: gezinId, created_by: userId })))
    .select();
  if (error) throw error;
  return data;
}

export async function updateRecept(id: string, invoer: ReceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .update(invoer)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Slaat de (eventueel bewerkte) velden op én zet het concept meteen om
// naar een normaal, zichtbaar recept.
export async function publiceerRecept(id: string, invoer: ReceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .update({ ...invoer, status: "definitief" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecept(id: string) {
  const { error } = await supabase.from("recepten").delete().eq("id", id);
  if (error) throw error;
}

// Aanmaken vanuit "delen vanuit Instagram" — categorie blijft weg uit de
// insert (en dus op de DB-default) als de parser hem niet kon herkennen;
// nooit een gegokte waarde wegschrijven.
export type ConceptInvoer = {
  titel: string;
  categorie?: string;
  bereidingstijd_minuten: number | null;
  porties: number | null;
  ingredienten: string[];
  stappen: string[];
  tags: string[];
  recept_url: string | null;
  bron: string;
  bron_url: string | null;
  ruwe_tekst: string;
};

export async function createConceptRecept(gezinId: string, userId: string, invoer: ConceptInvoer) {
  const { data, error } = await supabase
    .from("recepten")
    .insert({
      titel: invoer.titel,
      ...(invoer.categorie ? { categorie: invoer.categorie } : {}),
      bereidingstijd_minuten: invoer.bereidingstijd_minuten,
      porties: invoer.porties,
      ingredienten: invoer.ingredienten,
      stappen: invoer.stappen,
      tags: invoer.tags,
      recept_url: invoer.recept_url,
      bron: invoer.bron,
      bron_url: invoer.bron_url,
      ruwe_tekst: invoer.ruwe_tekst,
      gezin_id: gezinId,
      created_by: userId,
      status: "concept",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
