import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { VerlanglijstForm } from "@/components/verlanglijst-form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import {
  createVerlanglijstItem,
  deleteVerlanglijstItem,
  listVerlanglijst,
  toggleGekocht,
  type VerlanglijstInvoer,
  type VerlanglijstItem,
} from "@/lib/verlanglijst";

export const Route = createFileRoute("/verlanglijst")({
  head: () => ({ meta: [{ title: "Verlanglijst — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <VerlanglijstPage />
    </RequireGezin>
  ),
});

type Lid = { id: string; naam: string };

function VerlanglijstPage() {
  const { profile, user } = useAuth();
  const [leden, setLeden] = useState<Lid[]>([]);
  const [gekozenId, setGekozenId] = useState<string | null>(null);
  const [items, setItems] = useState<VerlanglijstItem[] | null>(null);
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
    listVerlanglijst(gekozenId)
      .then(setItems)
      .catch((err) => toast.error(foutTekst(err, "Verlanglijst laden mislukt.")));
  }, [gekozenId]);

  useEffect(() => {
    laad();
  }, [laad]);

  useEffect(() => {
    const channel = supabase
      .channel("verlanglijst-wijzigingen")
      .on("postgres_changes", { event: "*", schema: "public", table: "verlanglijst_items" }, () =>
        laad(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [laad]);

  const toevoegen = async (invoer: VerlanglijstInvoer) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      await createVerlanglijstItem(profile.gezin_id, user.id, invoer);
      toast.success("Toegevoegd aan de verlanglijst.");
      setNieuwOpen(false);
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Toevoegen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const toggle = async (item: VerlanglijstItem) => {
    if (!user) return;
    const nieuw = !item.gekocht;
    setItems((huidig) =>
      (huidig ?? []).map((i) =>
        i.id === item.id ? { ...i, gekocht: nieuw, gekocht_door: nieuw ? user.id : null } : i,
      ),
    );
    try {
      await toggleGekocht(item.id, nieuw, user.id);
    } catch (err) {
      toast.error(foutTekst(err, "Bijwerken mislukt."));
      laad();
    }
  };

  const verwijderen = async (item: VerlanglijstItem) => {
    setItems((huidig) => (huidig ?? []).filter((i) => i.id !== item.id));
    try {
      await deleteVerlanglijstItem(item.id);
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      laad();
    }
  };

  const isEigenLijst = gekozenId === user?.id;
  const magVerwijderen = (item: VerlanglijstItem) =>
    item.gebruiker_id === user?.id || profile?.rol === "ouder";
  const naamVoor = (id: string) => leden.find((l) => l.id === id)?.naam ?? "Gezinslid";

  return (
    <AppShell
      title="Verlanglijst"
      subtitle="Cadeau-ideeën voor het hele gezin"
      action={
        isEigenLijst ? (
          <button
            onClick={() => setNieuwOpen((o) => !o)}
            aria-label="Wens toevoegen"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            {nieuwOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        ) : undefined
      }
    >
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
          <VerlanglijstForm
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
          {isEigenLijst ? "Nog niets op je verlanglijst." : "Nog niets op deze verlanglijst."}
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
                  aria-label={item.gekocht ? "Zet terug als niet gekocht" : "Markeer als gekocht"}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    item.gekocht
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {item.gekocht && <span className="text-[10px]">✓</span>}
                </button>
                <div className="min-w-0 flex-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1 text-sm ${
                        item.gekocht ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {item.titel}
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </a>
                  ) : (
                    <p
                      className={`text-sm ${item.gekocht ? "text-muted-foreground line-through" : ""}`}
                    >
                      {item.titel}
                    </p>
                  )}
                  {(item.prijs != null || item.notitie) && (
                    <p className="text-[11px] text-muted-foreground">
                      {item.prijs != null && `€ ${item.prijs}`}
                      {item.prijs != null && item.notitie && " · "}
                      {item.notitie}
                    </p>
                  )}
                  {item.gekocht && item.gekocht_door && (
                    <p className="text-[11px] text-muted-foreground">
                      Gekocht door {naamVoor(item.gekocht_door)}
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
