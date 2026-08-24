import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { WeekmenuDagForm } from "@/components/weekmenu-dag-form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import {
  addDays,
  createDag,
  deleteDag,
  isVandaag,
  listWeek,
  startOfWeek,
  toDatumString,
  updateDag,
  type WeekmenuInvoer,
  type WeekmenuItem,
} from "@/lib/weekmenu";

export const Route = createFileRoute("/weekmenu")({
  head: () => ({ meta: [{ title: "Weekmenu — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <WeekmenuPage />
    </RequireGezin>
  ),
});

const DAGNAMEN = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

function formatteerBereik(start: Date, eind: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  const startTekst = start.toLocaleDateString("nl-NL", opts);
  const eindTekst = eind.toLocaleDateString("nl-NL", { ...opts, year: "numeric" });
  return `${startTekst} – ${eindTekst}`;
}

function WeekmenuPage() {
  const { profile, user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState<WeekmenuItem[] | null>(null);
  const [leden, setLeden] = useState<{ id: string; naam: string }[]>([]);
  const [recepten, setRecepten] = useState<{ id: string; titel: string }[]>([]);
  const [bewerkDatum, setBewerkDatum] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const dagen = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const eindDatum = dagen[6] ?? weekStart;

  useEffect(() => {
    setItems(null);
    const eind = addDays(weekStart, 6);
    listWeek(toDatumString(weekStart), toDatumString(eind))
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err, "Weekmenu laden mislukt.")));
  }, [weekStart]);

  useEffect(() => {
    if (!profile?.gezin_id) return;
    supabase
      .from("profiles")
      .select("id, naam")
      .eq("gezin_id", profile.gezin_id)
      .order("naam")
      .then(({ data }) => setLeden(data ?? []));
    supabase
      .from("recepten")
      .select("id, titel")
      .order("titel")
      .then(({ data }) => setRecepten(data ?? []));
  }, [profile?.gezin_id]);

  const itemVoorDag = (datum: string) => items?.find((i) => i.datum === datum) ?? null;

  const opslaan = async (datum: string, bestaand: WeekmenuItem | null, invoer: WeekmenuInvoer) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      const resultaat = bestaand
        ? await updateDag(bestaand.id, invoer)
        : await createDag(profile.gezin_id, user.id, datum, invoer);
      setItems((huidig) => [...(huidig ?? []).filter((i) => i.datum !== datum), resultaat]);
      setBewerkDatum(null);
      toast.success("Weekmenu bijgewerkt.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Opslaan mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const verwijderen = async (item: WeekmenuItem) => {
    setBezig(true);
    try {
      await deleteDag(item.id);
      setItems((huidig) => (huidig ?? []).filter((i) => i.id !== item.id));
      setBewerkDatum(null);
      toast.success("Verwijderd.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Verwijderen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  return (
    <AppShell
      title="Weekmenu"
      subtitle={formatteerBereik(weekStart, eindDatum)}
      action={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="Vorige week"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="Volgende week"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {items === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : (
        <ul className="space-y-2">
          {dagen.map((dag, i) => {
            const datum = toDatumString(dag);
            const item = itemVoorDag(datum);
            const kokNaam = item?.kok ? leden.find((l) => l.id === item.kok)?.naam : undefined;
            const vandaag = isVandaag(dag);

            return (
              <li key={datum}>
                <div
                  className={`rounded-xl border p-3 shadow-card ${vandaag ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {DAGNAMEN[i]}
                      {vandaag && <span className="ml-1 text-primary">· vandaag</span>}
                    </p>
                    {item && bewerkDatum !== datum && (
                      <button
                        onClick={() => setBewerkDatum(datum)}
                        aria-label="Bewerken"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {bewerkDatum === datum ? (
                    <WeekmenuDagForm
                      initieel={
                        item
                          ? {
                              titel: item.titel,
                              recept_id: item.recept_id,
                              kok: item.kok,
                              notitie: item.notitie,
                            }
                          : undefined
                      }
                      leden={leden}
                      recepten={recepten}
                      bezig={bezig}
                      onOpslaan={(invoer) => opslaan(datum, item, invoer)}
                      onAnnuleren={() => setBewerkDatum(null)}
                      onVerwijderen={item ? () => verwijderen(item) : undefined}
                    />
                  ) : item ? (
                    <div>
                      <p className="font-display text-sm leading-tight">{item.titel}</p>
                      {kokNaam && <p className="text-xs text-muted-foreground">{kokNaam} kookt</p>}
                      {item.notitie && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.notitie}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setBewerkDatum(datum)}
                      className="flex items-center gap-1 text-sm text-muted-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" /> Maaltijd toevoegen
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
