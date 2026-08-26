import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, ChefHat, Gift, ListChecks } from "lucide-react";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { FotoVanDeDag } from "@/components/foto-van-de-dag";
import { PrikbordPreview } from "@/components/prikbord-preview";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toDatumString, type WeekmenuItem } from "@/lib/weekmenu";
import { formatteerTijd, type AgendaItem } from "@/lib/agenda";
import { type Klusje } from "@/lib/klusjes";
import { dagenTotVerjaardag, formatteerVerjaardag } from "@/lib/verjaardagen";

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
  const [afspraken, setAfspraken] = useState<AgendaItem[] | null>(null);

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
      .eq("datum", vandaagStr)
      .order("tijd", { ascending: true, nullsFirst: false })
      .then(({ data }) => setAfspraken(data ?? []));
  }, [profile?.gezin_id, vandaagStr]);

  const naamVoor = (id: string | null) => (id ? leden.find((l) => l.id === id)?.naam : undefined);

  const verjaardagen = leden
    .filter((l): l is Lid & { geboortedatum: string } => !!l.geboortedatum)
    .map((l) => ({ lid: l, dagen: dagenTotVerjaardag(l.geboortedatum, vandaag) }))
    .filter(({ dagen }) => dagen <= 7)
    .sort((a, b) => a.dagen - b.dagen);

  return (
    <AppShell title="Vandaag" subtitle={profile?.naam ? `${groet}, ${profile.naam}` : groet}>
      <FotoVanDeDag />

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
          <Link to="/weekmenu" className="text-sm text-muted-foreground underline">
            Nog niets ingevuld voor vandaag
          </Link>
        )}
      </SectionCard>

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
          <CalendarClock className="h-4 w-4" /> Afspraken vandaag
        </div>
        {afspraken === null ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : afspraken.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen afspraken vandaag.</p>
        ) : (
          <ul className="space-y-1">
            {afspraken.map((a) => (
              <li key={a.id} className="text-sm">
                {a.tijd && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatteerTijd(a.tijd)}{" "}
                  </span>
                )}
                {a.titel}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {verjaardagen.length > 0 && (
        <SectionCard>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Gift className="h-4 w-4" /> Verjaardagen
          </div>
          <ul className="space-y-1">
            {verjaardagen.map(({ lid, dagen }) => (
              <li key={lid.id} className="text-sm">
                {lid.naam}{" "}
                <span className="text-muted-foreground">
                  {dagen === 0 ? "— vandaag!" : `— ${formatteerVerjaardag(lid.geboortedatum)}`}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <PrikbordPreview />
    </AppShell>
  );
}
