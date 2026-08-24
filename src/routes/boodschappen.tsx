import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChefHat, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import {
  addItem,
  deleteItem,
  genereerVanWeekmenu,
  listBoodschappen,
  toggleAfgevinkt,
  verwijderAfgevinkt,
  type BoodschappenItem,
} from "@/lib/boodschappen";
import { addDays, startOfWeek, toDatumString } from "@/lib/weekmenu";

export const Route = createFileRoute("/boodschappen")({
  head: () => ({ meta: [{ title: "Boodschappen — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <BoodschappenPage />
    </RequireGezin>
  ),
});

function BoodschappenPage() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<BoodschappenItem[] | null>(null);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [bezig, setBezig] = useState(false);
  const [genererend, setGenererend] = useState(false);

  const laad = useCallback(() => {
    listBoodschappen()
      .then(setItems)
      .catch((err) => toast.error(foutTekst(err, "Boodschappenlijst laden mislukt.")));
  }, []);

  useEffect(() => {
    laad();
  }, [laad]);

  const toevoegen = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.gezin_id || !user || !nieuweNaam.trim()) return;
    setBezig(true);
    try {
      const item = await addItem(profile.gezin_id, user.id, nieuweNaam.trim());
      setItems((huidig) => [...(huidig ?? []), item]);
      setNieuweNaam("");
    } catch (err) {
      toast.error(foutTekst(err, "Item toevoegen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const toggle = async (item: BoodschappenItem) => {
    const nieuw = !item.afgevinkt;
    setItems((huidig) =>
      (huidig ?? []).map((i) => (i.id === item.id ? { ...i, afgevinkt: nieuw } : i)),
    );
    try {
      await toggleAfgevinkt(item.id, nieuw);
    } catch (err) {
      toast.error(foutTekst(err, "Bijwerken mislukt."));
      setItems((huidig) =>
        (huidig ?? []).map((i) => (i.id === item.id ? { ...i, afgevinkt: !nieuw } : i)),
      );
    }
  };

  const verwijderen = async (item: BoodschappenItem) => {
    setItems((huidig) => (huidig ?? []).filter((i) => i.id !== item.id));
    try {
      await deleteItem(item.id);
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      laad();
    }
  };

  const wisAfgevinkt = async () => {
    setBezig(true);
    try {
      await verwijderAfgevinkt();
      setItems((huidig) => (huidig ?? []).filter((i) => !i.afgevinkt));
    } catch (err) {
      toast.error(foutTekst(err, "Wissen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const genereer = async () => {
    if (!profile?.gezin_id || !user) return;
    setGenererend(true);
    try {
      const start = startOfWeek(new Date());
      const eind = addDays(start, 6);
      const aantal = await genereerVanWeekmenu(
        profile.gezin_id,
        user.id,
        toDatumString(start),
        toDatumString(eind),
      );
      if (aantal === 0) {
        toast.info("Geen nieuwe ingrediënten — vul eerst recepten in bij het weekmenu.");
      } else {
        toast.success(`${aantal} ${aantal === 1 ? "item" : "items"} toegevoegd uit het weekmenu.`);
      }
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Genereren mislukt."));
    } finally {
      setGenererend(false);
    }
  };

  const openstaand = (items ?? []).filter((i) => !i.afgevinkt);
  const afgevinkt = (items ?? []).filter((i) => i.afgevinkt);

  return (
    <AppShell title="Boodschappen" subtitle="Voor het hele gezin">
      <SectionCard className="mb-3">
        <form onSubmit={toevoegen} className="flex gap-2">
          <Input
            value={nieuweNaam}
            onChange={(e) => setNieuweNaam(e.target.value)}
            placeholder="Bv. melk"
            className="flex-1"
          />
          <Button type="submit" disabled={bezig || !nieuweNaam.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        <button
          onClick={() => void genereer()}
          disabled={genererend}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60"
        >
          <ChefHat className="h-4 w-4" />
          {genererend ? "Bezig…" : "Genereer uit het weekmenu van deze week"}
        </button>
      </SectionCard>

      {items === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : openstaand.length === 0 && afgevinkt.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          Nog niets op de lijst.
        </SectionCard>
      ) : (
        <>
          {openstaand.length > 0 && (
            <SectionCard className="mb-3">
              <ul className="space-y-1">
                {openstaand.map((item) => (
                  <BoodschappenRij
                    key={item.id}
                    item={item}
                    onToggle={toggle}
                    onVerwijder={verwijderen}
                  />
                ))}
              </ul>
            </SectionCard>
          )}

          {afgevinkt.length > 0 && (
            <SectionCard>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Afgevinkt
                </h2>
                <button
                  onClick={() => void wisAfgevinkt()}
                  disabled={bezig}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Wis afgevinkte
                </button>
              </div>
              <ul className="space-y-1">
                {afgevinkt.map((item) => (
                  <BoodschappenRij
                    key={item.id}
                    item={item}
                    onToggle={toggle}
                    onVerwijder={verwijderen}
                  />
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </AppShell>
  );
}

function BoodschappenRij({
  item,
  onToggle,
  onVerwijder,
}: {
  item: BoodschappenItem;
  onToggle: (item: BoodschappenItem) => void;
  onVerwijder: (item: BoodschappenItem) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
      <button
        onClick={() => onToggle(item)}
        aria-label={item.afgevinkt ? "Zet terug als openstaand" : "Vink af"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          item.afgevinkt ? "border-primary bg-primary text-primary-foreground" : "border-input"
        }`}
      >
        {item.afgevinkt && <span className="text-[10px]">✓</span>}
      </button>
      <span
        className={`flex-1 text-sm ${item.afgevinkt ? "text-muted-foreground line-through" : ""}`}
      >
        {item.naam}
      </span>
      <button
        onClick={() => onVerwijder(item)}
        aria-label="Verwijderen"
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
