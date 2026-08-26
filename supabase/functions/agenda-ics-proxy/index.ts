// Edge Function: haalt de gekoppelde iCal-agenda's van alle
// gezinsleden op (server-side — browsers mogen dit niet zelf doen,
// zowat geen enkele agenda-aanbieder zet CORS-headers op hun
// iCal-export) en geeft alleen de resulterende afspraken terug,
// nooit de ical_url zelf.
//
// Gebruikt de service-role om agenda_koppelingen te lezen buiten RLS
// om (nodig om ook de links van ándere gezinsleden te zien), maar
// scoopt dat altijd op het gezin_id dat hoort bij de meegestuurde
// gebruiker-JWT — nooit een ander gezin. SUPABASE_URL/ANON_KEY/
// SERVICE_ROLE_KEY worden automatisch door Supabase in elke Edge
// Function-omgeving gezet, geen handmatige secrets nodig.
import { createClient } from "npm:@supabase/supabase-js@2";
import ICAL from "npm:ical.js@2.1.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOORUIT_DAGEN = 60;
// Per terugkerende afspraak: hoeveel herhalingen we hoogstens bekijken
// (iteraties vóór "nu" tellen mee — anders loopt een dagelijkse serie uit
// 2015 duizenden keren door en tikt de Edge Function tegen de CPU-limiet).
const MAX_ITERATIES = 400;
const MAX_AFSPRAKEN_PER_AGENDA = 300;
// Grote iCal-exports (megabytes) volledig parsen kost te veel CPU.
const MAX_ICAL_BYTES = 2_000_000;

type ExterneAfspraak = { titel: string; start: string; eind: string; heleDag: boolean };
type Resultaat = {
  gebruiker_id: string;
  naam: string;
  label: string | null;
  afspraken: ExterneAfspraak[];
  fout: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Niet ingelogd." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await asUser.auth.getUser();
    if (userError || !userData.user) return json({ error: "Niet ingelogd." }, 401);

    const { data: profiel, error: profielError } = await asUser
      .from("profiles")
      .select("gezin_id")
      .eq("id", userData.user.id)
      .single();
    if (profielError || !profiel?.gezin_id) return json({ error: "Geen gezin gevonden." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: koppelingen, error: koppelingenError } = await admin
      .from("agenda_koppelingen")
      .select("gebruiker_id, label, ical_url")
      .eq("gezin_id", profiel.gezin_id);
    if (koppelingenError) throw koppelingenError;

    const { data: leden } = await admin
      .from("profiles")
      .select("id, naam")
      .eq("gezin_id", profiel.gezin_id);
    const naamVoor = (id: string) => leden?.find((l) => l.id === id)?.naam ?? "Gezinslid";

    const nu = new Date();
    const tot = new Date(nu.getTime() + VOORUIT_DAGEN * 24 * 60 * 60 * 1000);

    const resultaten: Resultaat[] = await Promise.all(
      (koppelingen ?? []).map(async (koppeling) => {
        try {
          const afspraken = await haalAfsprakenOp(koppeling.ical_url, nu, tot);
          return {
            gebruiker_id: koppeling.gebruiker_id,
            naam: naamVoor(koppeling.gebruiker_id),
            label: koppeling.label,
            afspraken,
            fout: null,
          };
        } catch (err) {
          return {
            gebruiker_id: koppeling.gebruiker_id,
            naam: naamVoor(koppeling.gebruiker_id),
            label: koppeling.label,
            afspraken: [],
            fout: err instanceof Error ? err.message : "Ophalen mislukt.",
          };
        }
      }),
    );

    return json({ resultaten });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Onbekende fout." }, 500);
  }
});

async function haalAfsprakenOp(icalUrl: string, nu: Date, tot: Date): Promise<ExterneAfspraak[]> {
  const resp = await fetch(icalUrl);
  if (!resp.ok) throw new Error(`Agenda niet bereikbaar (HTTP ${resp.status}).`);
  const tekst = await resp.text();

  const jcal = ICAL.parse(tekst);
  const component = new ICAL.Component(jcal);
  const vevents = component.getAllSubcomponents("vevent");

  const afspraken: ExterneAfspraak[] = [];

  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent);
      const voegToe = (start: Date, eind: Date) => {
        afspraken.push({
          titel: event.summary || "(zonder titel)",
          start: start.toISOString(),
          eind: eind.toISOString(),
          heleDag: event.startDate?.isDate ?? false,
        });
      };

      if (event.isRecurring()) {
        const iterator = event.iterator();
        let next;
        let aantal = 0;
        while ((next = iterator.next()) && aantal < MAX_OCCURRENCES) {
          aantal++;
          const details = event.getOccurrenceDetails(next);
          const start = details.startDate.toJSDate();
          const eind = details.endDate.toJSDate();
          if (start > tot) break;
          if (eind < nu) continue;
          voegToe(start, eind);
        }
      } else {
        const start = event.startDate?.toJSDate();
        const eind = event.endDate?.toJSDate();
        if (start && eind && eind >= nu && start <= tot) {
          voegToe(start, eind);
        }
      }
    } catch {
      // Eén onleesbare afspraak mag de rest van de agenda niet blokkeren.
      continue;
    }
  }

  return afspraken;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
