// Edge Function: haalt de gekoppelde iCal-agenda's van alle
// gezinsleden op (server-side — browsers mogen dit niet zelf doen,
// zowat geen enkele agenda-aanbieder zet CORS-headers op hun
// iCal-export) en geeft alleen de resulterende afspraken terug,
// nooit de ical_url zelf.
//
// Gebruikt de service-role om agenda_koppelingen te lezen buiten RLS
// om (nodig om ook de links van ándere gezinsleden te zien), maar
// scoopt dat altijd op het gezin_id dat hoort bij de meegestuurde
// gebruiker-JWT — nooit een ander gezin.
import { createClient } from "npm:@supabase/supabase-js@2";
import ICAL from "npm:ical.js@2.1.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOORUIT_DAGEN = 60;
// Per terugkerende afspraak: hoeveel herhalingen we hoogstens bekijken.
const MAX_ITERATIES = 200;
const MAX_AFSPRAKEN_PER_AGENDA = 300;
// Werkgrens tijdens het verzamelen; pas achteraf sorteren en afkappen.
const MAX_VERZAMELD = 2000;

// Grote agenda's bevatten soms duizenden losse afspraken; losse afspraken
// zijn goedkoop, dus deze grens ligt ruim boven een normale gezinsagenda.
const MAX_VEVENTS = 8000;
// Grote iCal-exports volledig parsen kost te veel CPU.
const MAX_ICAL_BYTES = 5_000_000;

// Totaal rekenbudget voor alle agenda's samen (ms).
const TIJD_BUDGET_MS = 6000;

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
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await asUser.auth.getUser(jwt);
    if (userError || !userData.user) {
      return json({ error: userError?.message ?? "Niet ingelogd." }, 401);
    }

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
    const deadline = Date.now() + TIJD_BUDGET_MS;

    const resultaten: Resultaat[] = await Promise.all(
      (koppelingen ?? []).map(async (koppeling) => {
        try {
          const afspraken = await haalAfsprakenOp(koppeling.ical_url, nu, tot, deadline);
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

async function haalAfsprakenOp(
  icalUrl: string,
  nu: Date,
  tot: Date,
  deadline: number,
): Promise<ExterneAfspraak[]> {
  const resp = await fetch(icalUrl);
  if (!resp.ok) throw new Error(`Agenda niet bereikbaar (HTTP ${resp.status}).`);
  const aangekondigdeLengte = Number(resp.headers.get("content-length") ?? 0);
  if (aangekondigdeLengte > MAX_ICAL_BYTES) {
    await resp.body?.cancel();
    throw new Error("Agenda is te groot om te verwerken.");
  }
  const tekst = await resp.text();
  if (tekst.length > MAX_ICAL_BYTES) throw new Error("Agenda is te groot om te verwerken.");

  const jcal = ICAL.parse(tekst);
  const component = new ICAL.Component(jcal);
  const vevents = component.getAllSubcomponents("vevent").slice(0, MAX_VEVENTS);

  const afspraken: ExterneAfspraak[] = [];
  const venstervanaf = new Date(nu.getTime() - 24 * 60 * 60 * 1000);

  for (const vevent of vevents) {
    if (afspraken.length >= MAX_VERZAMELD) break;
    if (Date.now() > deadline) break;
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
        // Series die al helemaal voorbij zijn: meteen overslaan.
        const rrule = vevent.getFirstPropertyValue("rrule") as
          | {
              until?: { toJSDate(): Date };
              freq?: string;
              interval?: number;
              parts?: Record<string, unknown>;
            }
          | null;
        const until = rrule?.until?.toJSDate?.();
        if (until && until < nu) continue;

        // Vooruitspoelen naar een ÉCHTE herhaling dicht bij nu: dtstart plus
        // n hele periodes. Zo blijven dag en uur exact kloppen (een willekeurig
        // moment meegeven zou de begintijd van de serie overschrijven), maar
        // hoeven we niet alle herhalingen sinds jaren terug af te lopen.
        let startVanaf: unknown = undefined;
        try {
          const dtstart = event.startDate;
          const freq = rrule?.freq;
          const interval = rrule?.interval && rrule.interval > 0 ? rrule.interval : 1;
          const eenvoudig = !rrule?.parts || Object.keys(rrule.parts).length === 0;
          const periodeSec =
            freq === "DAILY" ? 86400 * interval : freq === "WEEKLY" ? 604800 * interval : 0;
          if (dtstart && periodeSec > 0 && (freq === "WEEKLY" || eenvoudig)) {
            const verschilSec = (venstervanaf.getTime() - dtstart.toJSDate().getTime()) / 1000;
            const n = Math.floor(verschilSec / periodeSec);
            if (n > 0) {
              const kandidaat = dtstart.clone();
              kandidaat.addDuration(ICAL.Duration.fromSeconds(n * periodeSec));
              startVanaf = kandidaat;
            }
          }
        } catch {
          startVanaf = undefined;
        }

        let iterator;
        try {
          iterator = startVanaf ? event.iterator(startVanaf) : event.iterator();
        } catch {
          iterator = event.iterator();
        }

        let next;
        let iteraties = 0;
        while ((next = iterator.next())) {
          if (++iteraties > MAX_ITERATIES) break;
          if ((iteraties & 31) === 0 && Date.now() > deadline) break;
          const start = next.toJSDate();
          if (start > tot) break;
          // Goedkope voorfilter: getOccurrenceDetails is duur.
          if (start.getTime() < venstervanaf.getTime()) continue;
          const details = event.getOccurrenceDetails(next);
          const echteStart = details.startDate.toJSDate();
          const eind = details.endDate.toJSDate();
          if (echteStart > tot) break;
          if (eind < nu) continue;
          voegToe(echteStart, eind);
          if (afspraken.length >= MAX_AFSPRAKEN_PER_AGENDA) break;
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

  afspraken.sort((a, b) => a.start.localeCompare(b.start));
  return afspraken.slice(0, MAX_AFSPRAKEN_PER_AGENDA);

}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
