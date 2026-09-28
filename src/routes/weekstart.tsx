import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Gift,
  ListChecks,
  Plus,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { WeekmenuDagForm } from "@/components/weekmenu-dag-form";
import { PersoonBadge } from "@/components/persoon-badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import {
  addDays,
  createDag,
  isVandaag,
  listWeek,
  startOfWeek,
  toDatumString,
  type WeekmenuInvoer,
  type WeekmenuItem,
} from "@/lib/weekmenu";
import { formatteerDeadline, toewijzen, type Klusje } from "@/lib/klusjes";
import { vraagWeekmenuSuggestieAan, type WeekmenuVoorstel } from "@/lib/weekmenuSuggestie";
import { formatteerDatum, formatteerTijd, type AgendaItem } from "@/lib/agenda";
import { dagenTotVerjaardag, formatteerVerjaardag } from "@/lib/verjaardagen";
import { listVerjaardagen, type VerjaardagContact } from "@/lib/verjaardagenContacten";
import { genereerVanWeekmenu } from "@/lib/boodschappen";

export const Route = createFileRoute("/weekstart")({
  head: () => ({ meta: [{ title: "Weekstart — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <WeekstartPage />
    </RequireGezin>
  ),
});

const DAGNAMEN = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

type Lid = { id: string; naam: string; geboortedatum: string | null };

function formatteerBereik(start: Date, eind: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  const startTekst = start.toLocaleDateString("nl-NL", opts);
  const eindTekst = eind.toLocaleDateString("nl-NL", { ...opts, year: "numeric" });
  return `${startTekst} – ${eindTekst}`;
}

function WeekstartPage() {
  const { profile, user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [leden, setLeden] = useState<Lid[]>([]);
  const [recepten, setRecepten] = useState<{ id: string; titel: string }[]>([]);
  const [weekmenu, setWeekmenu] = useState<WeekmenuItem[] | null>(null);
  const [klusjes, setKlusjes] = useState<Klusje[] | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[] | null>(null);
  const [contacten, setContacten] = useState<VerjaardagContact[]>([]);
  const [invulDatum, setInvulDatum] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [lijstBezig, setLijstBezig] = useState(false);
  const [voorstellen, setVoorstellen] = useState<WeekmenuVoorstel[] | null>(null);
  const [voorstelBezig, setVoorstelBezig] = useState(false);

  const dagen = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const eindDatum = dagen[6] ?? weekStart;
  const startStr = toDatumString(weekStart);
  const eindStr = toDatumString(eindDatum);

  useEffect(() => {
    setWeekmenu(null);
    setKlusjes(null);
    setAgenda(null);
    setVoorstellen(null);

    listWeek(startStr, eindStr)
      .then(setWeekmenu)
      .catch((err) => toast.error(foutTekst(err, "Weekmenu laden mislukt.")));

    supabase
      .from("klusjes")
      .select("*")
      .eq("afgerond", false)
      .gte("deadline", startStr)
      .lte("deadline", eindStr)
      .order("deadline", { ascending: true })
      .then(({ data }) => setKlusjes(data ?? []));

    supabase
      .from("agenda_items")
      .select("*")
      .gte("datum", startStr)
      .lte("datum", eindStr)
      .order("datum", { ascending: true })
      .order("tijd", { ascending: true, nullsFirst: false })
      .then(({ data }) => setAgenda(data ?? []));
  }, [startStr, eindStr]);

  useEffect(() => {
    if (!profile?.gezin_id) return;
    supabase
      .from("profiles")
      .select("id, naam, geboortedatum")
      .eq("gezin_id", profile.gezin_id)
      .order("naam")
      .then(({ data }) => setLeden(data ?? []));
    supabase
      .from("recepten")
      .select("id, titel")
      .order("titel")
      .then(({ data }) => setRecepten(data ?? []));
  }, [profile?.gezin_id]);

  useEffect(() => {
    listVerjaardagen()
      .then(setContacten)
      .catch(() => setContacten([]));
  }, []);

  const naamVoor = (id: string | null) => (id ? leden.find((l) => l.id === id)?.naam : undefined);
  const itemVoorDag = (datum: string) => weekmenu?.find((i) => i.datum === datum) ?? null;

  const vulIn = async (datum: string, invoer: WeekmenuInvoer) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      const resultaat = await createDag(profile.gezin_id, user.id, datum, invoer);
      setWeekmenu((huidig) => [...(huidig ?? []).filter((i) => i.datum !== datum), resultaat]);
      setInvulDatum(null);
      toast.success("Weekmenu bijgewerkt.");
    } catch (err) {
      toast.error(foutTekst(err, "Opslaan mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const voorstelVoorDag = (datum: string) => voorstellen?.find((v) => v.datum === datum) ?? null;

  const vraagSuggestieAan = async () => {
    setVoorstelBezig(true);
    try {
      const nieuw = await vraagWeekmenuSuggestieAan(startStr);
      if (nieuw.length === 0) {
        toast.info("Geen suggesties gevonden — vul handmatig in.");
      } else {
        setVoorstellen(nieuw);
        toast.success(`${nieuw.length} suggestie(s) klaar om te bekijken.`);
      }
    } catch (err) {
      toast.error(foutTekst(err, "AI-suggestie ophalen is mislukt."));
    } finally {
      setVoorstelBezig(false);
    }
  };

  const overnemenVoorstel = async (voorstel: WeekmenuVoorstel) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      const resultaat = await createDag(profile.gezin_id, user.id, voorstel.datum, {
        titel: voorstel.titel,
        recept_id: voorstel.recept_id,
        kok: null,
        notitie: null,
      });
      setWeekmenu((huidig) => [
        ...(huidig ?? []).filter((i) => i.datum !== voorstel.datum),
        resultaat,
      ]);
      setVoorstellen((huidig) => (huidig ?? []).filter((v) => v.datum !== voorstel.datum));
      toast.success("Weekmenu bijgewerkt.");
    } catch (err) {
      toast.error(foutTekst(err, "Opslaan mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const wisselenVoorstel = (datum: string) => {
    setVoorstellen((huidig) => (huidig ?? []).filter((v) => v.datum !== datum));
    setInvulDatum(datum);
  };

  const afwijzenVoorstel = (datum: string) => {
    setVoorstellen((huidig) => (huidig ?? []).filter((v) => v.datum !== datum));
  };

  const wijsToe = async (klusje: Klusje, persoonId: string | null) => {
    const vorige = klusje.toegewezen_aan;
    setKlusjes((huidig) =>
      (huidig ?? []).map((k) => (k.id === klusje.id ? { ...k, toegewezen_aan: persoonId } : k)),
    );
    try {
      await toewijzen(klusje.id, persoonId);
    } catch (err) {
      toast.error(foutTekst(err, "Toewijzen mislukt."));
      setKlusjes((huidig) =>
        (huidig ?? []).map((k) => (k.id === klusje.id ? { ...k, toegewezen_aan: vorige } : k)),
      );
    }
  };

  const genereerLijst = async () => {
    if (!profile?.gezin_id || !user) return;
    setLijstBezig(true);
    try {
      const aantal = await genereerVanWeekmenu(profile.gezin_id, user.id, startStr, eindStr);
      toast.success(
        aantal > 0
          ? `${aantal} ingrediënt(en) toegevoegd aan de boodschappenlijst.`
          : "Niets nieuws om toe te voegen.",
      );
    } catch (err) {
      toast.error(foutTekst(err, "Boodschappenlijst genereren mislukt."));
    } finally {
      setLijstBezig(false);
    }
  };

  const klusjesPerPersoon = new Map<string, Klusje[]>();
  const onbeheerd: Klusje[] = [];
  (klusjes ?? []).forEach((k) => {
    if (k.toegewezen_aan) {
      const lijst = klusjesPerPersoon.get(k.toegewezen_aan) ?? [];
      lijst.push(k);
      klusjesPerPersoon.set(k.toegewezen_aan, lijst);
    } else {
      onbeheerd.push(k);
    }
  });

  const verjaardagen = [
    ...leden
      .filter((l): l is Lid & { geboortedatum: string } => !!l.geboortedatum)
      .map((l) => ({ key: `lid-${l.id}`, naam: l.naam, geboortedatum: l.geboortedatum })),
    ...contacten.map((c) => ({
      key: `contact-${c.id}`,
      naam: c.naam,
      geboortedatum: c.geboortedatum,
    })),
  ]
    .map((v) => ({ ...v, dagen: dagenTotVerjaardag(v.geboortedatum, new Date()) }))
    .filter(({ dagen }) => dagen >= 0 && dagen <= 14)
    .sort((a, b) => a.dagen - b.dagen);

  return (
    <AppShell
      title="Weekstart"
      subtitle={formatteerBereik(weekStart, eindDatum)}
      terug="/"
      action={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="Vorige week"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="Volgende week"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <SectionCard className="mb-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ChefHat className="h-4 w-4" /> Weekmenu
        </div>
        <Button
          onClick={() => void vraagSuggestieAan()}
          disabled={
            voorstelBezig || weekmenu === null || dagen.every((d) => itemVoorDag(toDatumString(d)))
          }
          variant="outline"
          size="sm"
          className="mb-2 w-full"
        >
          <Sparkles className="h-4 w-4" />
          {voorstelBezig ? "Bezig met nadenken…" : "Stel een weekmenu voor"}
        </Button>
        {weekmenu === null ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : (
          <ul className="space-y-2">
            {dagen.map((dag, i) => {
              const datum = toDatumString(dag);
              const item = itemVoorDag(datum);
              const kokNaam = item?.kok ? naamVoor(item.kok) : undefined;
              const vandaag = isVandaag(dag);

              return (
                <li key={datum}>
                  <div
                    className={`rounded-lg border p-2 ${vandaag ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {DAGNAMEN[i]}
                      {vandaag && <span className="ml-1 text-primary">· vandaag</span>}
                    </p>
                    {invulDatum === datum ? (
                      <WeekmenuDagForm
                        leden={leden}
                        recepten={recepten}
                        bezig={bezig}
                        onOpslaan={(invoer) => vulIn(datum, invoer)}
                        onAnnuleren={() => setInvulDatum(null)}
                      />
                    ) : item ? (
                      <div>
                        <p className="text-sm">{item.titel}</p>
                        {kokNaam && item.kok && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <PersoonBadge naam={kokNaam} gebruikerId={item.kok} />
                            {kokNaam} kookt
                          </p>
                        )}
                      </div>
                    ) : voorstelVoorDag(datum) ? (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1 text-sm">
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-secondary" />
                          {voorstelVoorDag(datum)!.titel}
                        </p>
                        <div className="flex gap-3 text-xs font-medium">
                          <button
                            onClick={() => void overnemenVoorstel(voorstelVoorDag(datum)!)}
                            disabled={bezig}
                            className="text-secondary hover:underline"
                          >
                            Overnemen
                          </button>
                          <button
                            onClick={() => wisselenVoorstel(datum)}
                            className="text-muted-foreground hover:underline"
                          >
                            Wisselen
                          </button>
                          <button
                            onClick={() => afwijzenVoorstel(datum)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            Afwijzen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setInvulDatum(datum)}
                        className="flex items-center gap-1 text-sm font-medium text-secondary"
                      >
                        <Plus className="h-3.5 w-3.5" /> Maaltijd invullen
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Button
          onClick={() => void genereerLijst()}
          disabled={lijstBezig}
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
        >
          <ShoppingCart className="h-4 w-4" />
          {lijstBezig ? "Bezig…" : "Boodschappenlijst genereren voor deze week"}
        </Button>
      </SectionCard>

      <SectionCard className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-4 w-4" /> Klusjes deze week
          </div>
          <Link to="/klusjes" className="text-xs text-secondary underline">
            Bekijk alles
          </Link>
        </div>
        {klusjes === null ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : klusjes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Niets met een deadline deze week.</p>
        ) : (
          <div className="space-y-3">
            {[...klusjesPerPersoon.entries()].map(([persoonId, lijst]) => (
              <div key={persoonId}>
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground">
                  <PersoonBadge naam={naamVoor(persoonId) ?? "?"} gebruikerId={persoonId} />
                  {naamVoor(persoonId) ?? "Onbekend"}
                </p>
                <ul className="space-y-1">
                  {lijst.map((k) => (
                    <KlusjeRegel key={k.id} klusje={k} leden={leden} onWijsToe={wijsToe} />
                  ))}
                </ul>
              </div>
            ))}
            {onbeheerd.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  Nog niet toegewezen
                </p>
                <ul className="space-y-1">
                  {onbeheerd.map((k) => (
                    <KlusjeRegel key={k.id} klusje={k} leden={leden} onWijsToe={wijsToe} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-4 w-4" /> Agenda deze week
          </div>
          <Link to="/agenda" className="text-xs text-secondary underline">
            Bekijk agenda
          </Link>
        </div>
        {agenda === null ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : agenda.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen afspraken deze week.</p>
        ) : (
          <ul className="space-y-1">
            {agenda.map((a) => {
              const naam = naamVoor(a.created_by);
              return (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  {a.created_by && naam && <PersoonBadge naam={naam} gebruikerId={a.created_by} />}
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatteerDatum(a.datum)}
                    {a.tijd && ` · ${formatteerTijd(a.tijd)}`}
                  </span>
                  {a.titel}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Gift className="h-4 w-4" /> Verjaardagen
        </div>
        {verjaardagen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen verjaardagen binnenkort.</p>
        ) : (
          <ul className="space-y-1">
            {verjaardagen.map(({ key, naam, dagen, geboortedatum }) => (
              <li key={key} className="text-sm">
                {naam}{" "}
                <span className="text-muted-foreground">
                  {dagen === 0 ? "— vandaag!" : `— ${formatteerVerjaardag(geboortedatum)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </AppShell>
  );
}

function KlusjeRegel({
  klusje,
  leden,
  onWijsToe,
}: {
  klusje: Klusje;
  leden: { id: string; naam: string }[];
  onWijsToe: (klusje: Klusje, persoonId: string | null) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-muted">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{klusje.titel}</p>
        {klusje.deadline && (
          <p className="text-[11px] text-muted-foreground">{formatteerDeadline(klusje.deadline)}</p>
        )}
      </div>
      <select
        value={klusje.toegewezen_aan ?? ""}
        onChange={(e) => onWijsToe(klusje, e.target.value || null)}
        className="shrink-0 rounded-md border border-input bg-transparent px-1.5 py-1 text-xs"
      >
        <option value="">Niet toegewezen</option>
        {leden.map((l) => (
          <option key={l.id} value={l.id}>
            {l.naam}
          </option>
        ))}
      </select>
    </li>
  );
}
