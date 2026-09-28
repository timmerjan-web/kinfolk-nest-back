import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { LijstItemForm } from "@/components/lijst-item-form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import { toastOngedaanMaken } from "@/lib/ongedaanMaken";
import {
  createLijstItem,
  deleteLijstItem,
  herstelLijstItem,
  listLijstItems,
  toggleAfgerond,
  type LijstItem,
  type LijstSoort,
} from "@/lib/lijstItems";

export const Route = createFileRoute("/kijk-leeslijst")({
  head: () => ({ meta: [{ title: "Kijk- & leeslijst — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <KijkLeeslijstPage />
    </RequireGezin>
  ),
});

type Lid = { id: string; naam: string };

const SOORTEN: { waarde: LijstSoort; label: string }[] = [
  { waarde: "kijken", label: "Kijken" },
  { waarde: "lezen", label: "Lezen" },
];

function KijkLeeslijstPage() {
  const { profile, user } = useAuth();
  const [soort, setSoort] = useState<LijstSoort>("kijken");
  const [leden, setLeden] = useState<Lid[]>([]);
  const [gekozenId, setGekozenId] = useState<string | null>(null);
  const [items, setItems] = useState<LijstItem[] | null>(null);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    if (user && !gekozenId) setGekozenId(user.id);
  }, [user, gekozenId]);

  useEffect(() => {
    if (!profile?.gezin_id) return;
    supabase
      .from("profiles")
      .select("id, naam")
      .eq("gezin_id", profile.gezin_id)
      .order("naam")
      .then(({ data }) => setLeden(data ?? []));
  }, [profile?.gezin_id]);

  const laad = useCallback(() => {
    if (!gekozenId) return;
    listLijstItems(gekozenId, soort)
      .then(setItems)
      .catch((err) => toast.error(foutTekst(err, "Lijst laden mislukt.")));
  }, [gekozenId, soort]);

  useEffect(() => {
    laad();
  }, [laad]);

  useEffect(() => {
    const channel = supabase
      .channel("lijst-items-wijzigingen")
      .on("postgres_changes", { event: "*", schema: "public", table: "lijst_items" }, () => laad())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [laad]);

  const toevoegen = async (invoer: { titel: string; notitie: string | null }) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      await createLijstItem(profile.gezin_id, user.id, { ...invoer, soort });
      toast.success("Toegevoegd.");
      setNieuwOpen(false);
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Toevoegen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const zetAfgerond = async (item: LijstItem, afgerond: boolean) => {
    if (!user) return;
    setItems((huidig) =>
      (huidig ?? []).map((i) =>
        i.id === item.id ? { ...i, afgerond, afgerond_door: afgerond ? user.id : null } : i,
      ),
    );
    try {
      await toggleAfgerond(item.id, afgerond, user.id);
    } catch (err) {
      toast.error(foutTekst(err, "Bijwerken mislukt."));
      laad();
    }
  };

  const toggle = async (item: LijstItem) => {
    const nieuw = !item.afgerond;
    await zetAfgerond(item, nieuw);
    if (nieuw) {
      const label = soort === "kijken" ? "gekeken" : "gelezen";
      toastOngedaanMaken(`"${item.titel}" gemarkeerd als ${label}.`, () =>
        zetAfgerond(item, false),
      );
    }
  };

  const verwijderen = async (item: LijstItem) => {
    setItems((huidig) => (huidig ?? []).filter((i) => i.id !== item.id));
    try {
      await deleteLijstItem(item.id);
      toastOngedaanMaken(`"${item.titel}" verwijderd.`, async () => {
        try {
          await herstelLijstItem(item);
          setItems((huidig) => [...(huidig ?? []), item]);
        } catch (err) {
          toast.error(foutTekst(err, "Herstellen mislukt."));
        }
      });
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      laad();
    }
  };

  const isEigenLijst = gekozenId === user?.id;
  const magVerwijderen = (item: LijstItem) =>
    item.gebruiker_id === user?.id || profile?.rol === "ouder";
  const naamVoor = (id: string) => leden.find((l) => l.id === id)?.naam ?? "Gezinslid";

  return (
    <AppShell
      title="Kijk- & leeslijst"
      subtitle="Voor het hele gezin"
      action={
        isEigenLijst ? (
          <button
            onClick={() => setNieuwOpen((o) => !o)}
            aria-label="Item toevoegen"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
          >
            {nieuwOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        ) : undefined
      }
    >
      <div className="mb-3 flex gap-1.5">
        {SOORTEN.map((s) => (
          <button
            key={s.waarde}
            onClick={() => {
              setSoort(s.waarde);
              setNieuwOpen(false);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium ${
              soort === s.waarde
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {leden.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {leden.map((l) => (
            <button
              key={l.id}
              onClick={() => setGekozenId(l.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                gekozenId === l.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {l.naam}
            </button>
          ))}
        </div>
      )}

      {nieuwOpen && isEigenLijst && (
        <div className="mb-3">
          <LijstItemForm
            soort={soort}
            bezig={bezig}
            onOpslaan={toevoegen}
            onAnnuleren={() => setNieuwOpen(false)}
          />
        </div>
      )}

      {items === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : items.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          {isEigenLijst ? "Nog niets op je lijst." : "Nog niets op deze lijst."}
        </SectionCard>
      ) : (
        <SectionCard>
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <button
                  onClick={() => void toggle(item)}
                  aria-label={
                    item.afgerond
                      ? "Zet terug als niet afgerond"
                      : soort === "kijken"
                        ? "Markeer als gekeken"
                        : "Markeer als gelezen"
                  }
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    item.afgerond
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {item.afgerond && <span className="text-[10px]">✓</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${item.afgerond ? "text-muted-foreground line-through" : ""}`}
                  >
                    {item.titel}
                  </p>
                  {item.notitie && (
                    <p className="text-[11px] text-muted-foreground">{item.notitie}</p>
                  )}
                  {item.afgerond && item.afgerond_door && (
                    <p className="text-[11px] text-muted-foreground">
                      {soort === "kijken" ? "Gekeken door" : "Gelezen door"}{" "}
                      {naamVoor(item.afgerond_door)}
                    </p>
                  )}
                </div>
                {magVerwijderen(item) && (
                  <button
                    onClick={() => void verwijderen(item)}
                    aria-label="Verwijderen"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </AppShell>
  );
}
