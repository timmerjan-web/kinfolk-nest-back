import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarClock, Camera, ChefHat, Gift, Heart, ListChecks } from "lucide-react";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { FotoVanDeDag } from "@/components/foto-van-de-dag";
import { PrikbordPreview } from "@/components/prikbord-preview";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { addDays, toDatumString, type WeekmenuItem } from "@/lib/weekmenu";
import { dagLabel, formatteerTijd, type AgendaItem } from "@/lib/agenda";
import { type Klusje } from "@/lib/klusjes";
import { dagenTotVerjaardag, formatteerVerjaardag } from "@/lib/verjaardagen";
import { listVerjaardagen, type VerjaardagContact } from "@/lib/verjaardagenContacten";
import { haalExterneAfspraken, type ExterneAgendaResultaat } from "@/lib/externeAgenda";

type EerstkomendItem = {
  key: string;
  titel: string;
  tijdstip: Date;
  heleDag: boolean;
  tijdLabel: string;
  naam?: string;
};

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Vandaag — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <TodayPage />
    </RequireGezin>
  ),
});

type Lid = { id: string; naam: string; geboortedatum: string | null };

function TodayPage() {
  const { profile } = useAuth();
  const uur = new Date().getHours();
  const groet = uur < 12 ? "Goedemorgen" : uur < 18 ? "Goedemiddag" : "Goedenavond";
  const vandaag = new Date();
  const vandaagStr = toDatumString(vandaag);

  const [leden, setLeden] = useState<Lid[]>([]);
  const [weekmenuVandaag, setWeekmenuVandaag] = useState<WeekmenuItem | null | undefined>(
    undefined,
  );
  const [klusjes, setKlusjes] = useState<Klusje[] | null>(null);
  const [contacten, setContacten] = useState<VerjaardagContact[]>([]);
  const [afsprakenAankomend, setAfsprakenAankomend] = useState<AgendaItem[] | null>(null);
  const [externeResultaten, setExterneResultaten] = useState<ExterneAgendaResultaat[] | null>(null);
  const morgenStr = toDatumString(addDays(vandaag, 1));

  useEffect(() => {
    if (!profile?.gezin_id) return;
    supabase
      .from("profiles")
      .select("id, naam, geboortedatum")
      .eq("gezin_id", profile.gezin_id)
      .then(({ data }) => setLeden(data ?? []));

    supabase
      .from("weekmenu_items")
      .select("*")
      .eq("datum", vandaagStr)
      .maybeSingle()
      .then(({ data }) => setWeekmenuVandaag(data ?? null));

    supabase
      .from("klusjes")
      .select("*")
      .eq("afgerond", false)
      .lte("deadline", vandaagStr)
      .order("deadline", { ascending: true })
      .then(({ data }) => setKlusjes(data ?? []));

    supabase
      .from("agenda_items")
      .select("*")
      .gte("datum", vandaagStr)
      .order("datum", { ascending: true })
      .order("tijd", { ascending: true, nullsFirst: false })
      .limit(10)
      .then(({ data }) => setAfsprakenAankomend(data ?? []));
  }, [profile?.gezin_id, vandaagStr]);

  useEffect(() => {
    haalExterneAfspraken()
      .then(setExterneResultaten)
      .catch(() => setExterneResultaten([]));
  }, [vandaagStr]);

  useEffect(() => {
    listVerjaardagen()
      .then(setContacten)
      .catch(() => setContacten([]));
  }, []);

  const eerstkomend = useMemo(() => {
    const nu = new Date();
    const eigen: EerstkomendItem[] = (afsprakenAankomend ?? []).map((a) => ({
      key: `eigen-${a.id}`,
      titel: a.titel,
      tijdstip: new Date(`${a.datum}T${a.tijd ?? "00:00:00"}`),
      heleDag: !a.tijd,
      tijdLabel: a.tijd ? formatteerTijd(a.tijd) : "Hele dag",
    }));
    const extern: EerstkomendItem[] = (externeResultaten ?? []).flatMap((r) =>
      r.afspraken.map((a, i) => ({
        key: `extern-${r.gebruiker_id}-${i}`,
        titel: a.titel,
        tijdstip: new Date(a.start),
        heleDag: a.heleDag,
        tijdLabel: a.heleDag
          ? "Hele dag"
          : new Date(a.start).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
        naam: r.naam,
      })),
    );
    return [...eigen, ...extern]
      .filter((i) => {
        const datumStr = toDatumString(i.tijdstip);
        if (datumStr < vandaagStr) return false;
        if (datumStr === vandaagStr && !i.heleDag) return i.tijdstip >= nu;
        return true;
      })
      .sort((a, b) => a.tijdstip.getTime() - b.tijdstip.getTime())
      .slice(0, 3);
  }, [afsprakenAankomend, externeResultaten, vandaagStr]);

  const naamVoor = (id: string | null) => (id ? leden.find((l) => l.id === id)?.naam : undefined);

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
    .map((v) => ({ ...v, dagen: dagenTotVerjaardag(v.geboortedatum, vandaag) }))
    .filter(({ dagen }) => dagen <= 7)
    .sort((a, b) => a.dagen - b.dagen);

  return (
    <AppShell title="Vandaag" subtitle={profile?.naam ? `${groet}, ${profile.naam}` : groet}>
      <SectionCard className="mb-3">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ListChecks className="h-4 w-4" /> Klusjes
        </div>
        {klusjes === null ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : klusjes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Niets openstaand met deadline vandaag of eerder.
          </p>
        ) : (
          <ul className="space-y-1">
            {klusjes.map((k) => (
              <li key={k.id} className="text-sm">
                {k.titel}
                {k.toegewezen_aan && (
                  <span className="text-muted-foreground"> — {naamVoor(k.toegewezen_aan)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard className="mb-3">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ChefHat className="h-4 w-4" /> Weekmenu
        </div>
        {weekmenuVandaag === undefined ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : weekmenuVandaag ? (
          <div>
            <p className="text-sm">{weekmenuVandaag.titel}</p>
            {weekmenuVandaag.kok && (
              <p className="text-xs text-muted-foreground">{naamVoor(weekmenuVandaag.kok)} kookt</p>
            )}
          </div>
        ) : (
          <Link to="/weekmenu" className="text-sm text-secondary underline">
            Nog niets ingevuld voor vandaag
          </Link>
        )}
      </SectionCard>

      <SectionCard className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-4 w-4" /> Eerstkomende afspraken
          </div>
          <Link to="/agenda" className="text-xs text-secondary underline">
            Bekijk agenda
          </Link>
        </div>
        {afsprakenAankomend === null || externeResultaten === null ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : eerstkomend.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen aankomende afspraken.</p>
        ) : (
          <ul className="space-y-1">
            {eerstkomend.map((i) => (
              <li key={i.key} className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {dagLabel(toDatumString(i.tijdstip), vandaagStr, morgenStr)}
                  {!i.heleDag && ` · ${i.tijdLabel}`}
                </span>{" "}
                {i.titel}
                {i.naam && <span className="text-muted-foreground"> ({i.naam})</span>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Gift className="h-4 w-4" /> Verjaardagen
          </div>
          <Link to="/verjaardagen" className="text-xs text-secondary underline">
            Bekijk alles
          </Link>
        </div>
        {verjaardagen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen verjaardagen deze week.</p>
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

      <FotoVanDeDag />

      <SectionCard className="mb-3">
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Meer
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            to="/verlanglijst"
            className="flex flex-col items-center gap-1 rounded-lg py-3 text-center hover:bg-muted"
          >
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="text-[11px]">Verlanglijst</span>
          </Link>
          <Link
            to="/fotos"
            className="flex flex-col items-center gap-1 rounded-lg py-3 text-center hover:bg-muted"
          >
            <Camera className="h-5 w-5 text-muted-foreground" />
            <span className="text-[11px]">Foto's</span>
          </Link>
          <Link
            to="/klus-sjablonen"
            className="flex flex-col items-center gap-1 rounded-lg py-3 text-center hover:bg-muted"
          >
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="text-[11px]">Klussencatalogus</span>
          </Link>
        </div>
      </SectionCard>

      <PrikbordPreview />
    </AppShell>
  );
}
