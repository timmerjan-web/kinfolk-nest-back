// Edge Function: stelt een weekmenu voor via de Claude API — server-side,
// zodat de API-sleutel nooit in de frontend terechtkomt. Eén scoped
// verzoek per klik (geen chatgeschiedenis, geen open gesprek): het
// frontend stuurt een week_start, deze functie kiest zelf welke dagen
// nog leeg zijn en welke recepten er beschikbaar zijn, en vraagt Claude
// om uitsluitend JSON terug — nooit méér dan recept-id's en titels de
// deur uit (kleine payload, geen onnodige data naar een externe API).
//
// Eenvoudige rem tegen een vastlopende knop: weekmenu_suggestie_log telt
// hoeveel aanvragen dit gezin vandaag al deed; boven de limiet wordt de
// aanvraag geweigerd zonder de Claude API aan te roepen.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAGLIMIET_PER_GEZIN = 5;
const CLAUDE_MODEL = "claude-sonnet-5";

type Recept = { id: string; titel: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Niet ingelogd." }, 401);

    const { week_start: weekStart } = (await req.json()) as { week_start?: string };
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return json({ error: "Ongeldige week_start." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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
    const gezinId = profiel.gezin_id;

    const weekDagen = Array.from({ length: 7 }, (_, i) => dagPlus(weekStart, i));
    const weekEind = weekDagen[6];

    const { data: ingevuld, error: ingevuldError } = await asUser
      .from("weekmenu_items")
      .select("datum")
      .gte("datum", weekStart)
      .lte("datum", weekEind);
    if (ingevuldError) throw ingevuldError;

    const ingevuldeSet = new Set((ingevuld ?? []).map((i) => i.datum));
    const openDagen = weekDagen.filter((d) => !ingevuldeSet.has(d));
    if (openDagen.length === 0) return json({ voorstellen: [] });

    const { data: recepten, error: receptenError } = await asUser
      .from("recepten")
      .select("id, titel")
      .eq("status", "definitief");
    if (receptenError) throw receptenError;
    if (!recepten || recepten.length === 0) {
      return json({ error: "Er staan nog geen recepten in het kookboek." }, 400);
    }

    const vandaag = weekStart;
    const drieWekenTerug = dagPlus(vandaag, -21);
    const { data: onlangs, error: onlangsError } = await asUser
      .from("weekmenu_items")
      .select("recept_id")
      .gte("datum", drieWekenTerug)
      .lt("datum", vandaag)
      .not("recept_id", "is", null);
    if (onlangsError) throw onlangsError;
    const onlangsGegetenSet = new Set(
      (onlangs ?? []).map((o) => o.recept_id).filter((id): id is string => !!id),
    );

    const vandaagUtc = new Date().toISOString().slice(0, 10);
    const { count: aantalVandaag, error: teltError } = await asUser
      .from("weekmenu_suggestie_log")
      .select("id", { count: "exact", head: true })
      .eq("gezin_id", gezinId)
      .gte("created_at", `${vandaagUtc}T00:00:00Z`);
    if (teltError) throw teltError;
    if ((aantalVandaag ?? 0) >= DAGLIMIET_PER_GEZIN) {
      return json(
        {
          error:
            "Dagelijkse limiet voor AI-suggesties bereikt. Vul handmatig in, of probeer morgen opnieuw.",
        },
        429,
      );
    }

    const { error: logError } = await asUser
      .from("weekmenu_suggestie_log")
      .insert({ gezin_id: gezinId, aangevraagd_door: userData.user.id });
    if (logError) throw logError;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "AI-suggestie is nog niet geconfigureerd op de server." }, 503);
    }

    const receptenPayload = (recepten as Recept[]).map((r) => ({
      id: r.id,
      titel: r.titel,
      onlangs_gegeten: onlangsGegetenSet.has(r.id),
    }));

    const prompt = bouwPrompt(receptenPayload, openDagen);

    let tekst: string;
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!resp.ok) throw new Error(`Claude API gaf status ${resp.status}.`);
      const data = (await resp.json()) as { content?: { type: string; text?: string }[] };
      tekst = data.content?.find((b) => b.type === "text")?.text ?? "";
      if (!tekst) throw new Error("Leeg antwoord van Claude.");
    } catch {
      return json(
        {
          error: "AI-suggestie ophalen is mislukt. Vul handmatig in, of probeer het later opnieuw.",
        },
        502,
      );
    }

    const receptIdSet = new Set(receptenPayload.map((r) => r.id));
    const openDagenSet = new Set(openDagen);
    const titelVoor = (id: string) => receptenPayload.find((r) => r.id === id)?.titel ?? "";

    const voorstellen = parseVoorstellen(tekst, openDagenSet, receptIdSet).map((v) => ({
      ...v,
      titel: titelVoor(v.recept_id),
    }));

    return json({ voorstellen });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Onbekende fout." }, 500);
  }
});

// "YYYY-MM-DD" + n dagen, zonder via Date-parsing van de string te gaan
// (voorkomt UTC-shift-bugs bij lokale datums).
function dagPlus(datumStr: string, n: number): string {
  const [jaar, maand, dag] = datumStr.split("-").map(Number);
  const d = new Date(jaar, maand - 1, dag + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function bouwPrompt(
  recepten: { id: string; titel: string; onlangs_gegeten: boolean }[],
  openDagen: string[],
): string {
  return `Je bent een maaltijdplanner voor een Nederlands gezin. Hieronder staat een lijst met beschikbare recepten (id en titel) uit hun kookboek, en een lijst met data waarvoor nog geen maaltijd is gepland.

Recepten (onlangs_gegeten: al gegeten in de laatste 2-3 weken, vermijd deze waar mogelijk voor variatie):
${JSON.stringify(recepten)}

Nog in te vullen data:
${JSON.stringify(openDagen)}

Kies voor elke datum een geschikt recept-id uit de lijst hierboven, met zoveel mogelijk variatie (vermijd dezelfde recepten kort na elkaar en vermijd waar mogelijk de onlangs_gegeten recepten). Als er te weinig geschikte recepten zijn om alle data te vullen, kies dan voor zoveel mogelijk data een recept en laat de rest weg.

Antwoord uitsluitend met JSON, geen inleiding, geen markdown-backticks: een array van objecten met exact de velden "datum" en "recept_id", bijvoorbeeld:
[{"datum":"2026-10-05","recept_id":"..."}]`;
}

// Parset defensief: Claude kan ondanks de instructie toch markdown-fences
// toevoegen, en elk voorstel wordt gevalideerd tegen de echt beschikbare
// data/recepten — nooit blind vertrouwen wat er terugkomt.
function parseVoorstellen(
  tekst: string,
  geldigeDagen: Set<string>,
  geldigeReceptIds: Set<string>,
): { datum: string; recept_id: string }[] {
  const schoon = tekst
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let ruw: unknown;
  try {
    ruw = JSON.parse(schoon);
  } catch {
    return [];
  }
  if (!Array.isArray(ruw)) return [];

  const gezien = new Set<string>();
  const resultaat: { datum: string; recept_id: string }[] = [];
  for (const item of ruw) {
    if (typeof item !== "object" || item === null) continue;
    const { datum, recept_id } = item as { datum?: unknown; recept_id?: unknown };
    if (typeof datum !== "string" || typeof recept_id !== "string") continue;
    if (!geldigeDagen.has(datum) || !geldigeReceptIds.has(recept_id)) continue;
    if (gezien.has(datum)) continue;
    gezien.add(datum);
    resultaat.push({ datum, recept_id });
  }
  return resultaat;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
