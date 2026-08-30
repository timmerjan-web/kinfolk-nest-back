import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { KlusSjabloonForm } from "@/components/klus-sjabloon-form";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import { klusIcoon } from "@/lib/klusIconen";
import {
  createKlusSjabloon,
  deleteKlusSjabloon,
  listKlusSjablonen,
  updateKlusSjabloon,
  type KlusSjabloon,
} from "@/lib/klusSjablonen";

export const Route = createFileRoute("/klus-sjablonen")({
  head: () => ({ meta: [{ title: "Klussencatalogus — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <KlusSjablonenPage />
    </RequireGezin>
  ),
});

function KlusSjablonenPage() {
  const { profile, user } = useAuth();
  const [sjablonen, setSjablonen] = useState<KlusSjabloon[] | null>(null);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const isOuder = profile?.rol === "ouder";

  const laad = useCallback(() => {
    listKlusSjablonen()
      .then(setSjablonen)
      .catch((err) => toast.error(foutTekst(err, "Klussencatalogus laden mislukt.")));
  }, []);

  useEffect(() => {
    laad();
  }, [laad]);

  const toevoegen = async (invoer: { titel: string; icoon: string }) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      await createKlusSjabloon(profile.gezin_id, user.id, invoer);
      toast.success("Klus toegevoegd aan de catalogus.");
      setNieuwOpen(false);
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Toevoegen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const bewerken = async (id: string, invoer: { titel: string; icoon: string }) => {
    setBezig(true);
    try {
      await updateKlusSjabloon(id, invoer);
      toast.success("Opgeslagen.");
      setBewerkId(null);
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Opslaan mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const verwijderen = async (sjabloon: KlusSjabloon) => {
    setSjablonen((huidig) => (huidig ?? []).filter((s) => s.id !== sjabloon.id));
    try {
      await deleteKlusSjabloon(sjabloon.id);
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      laad();
    }
  };

  return (
    <AppShell
      title="Klussencatalogus"
      subtitle="Voor het hele gezin"
      action={
        isOuder ? (
          <button
            onClick={() => setNieuwOpen((o) => !o)}
            aria-label="Klus toevoegen"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            {nieuwOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        ) : undefined
      }
    >
      {nieuwOpen && isOuder && (
        <div className="mb-3">
          <KlusSjabloonForm
            bezig={bezig}
            onOpslaan={toevoegen}
            onAnnuleren={() => setNieuwOpen(false)}
          />
        </div>
      )}

      {!isOuder && (
        <p className="mb-3 text-sm text-muted-foreground">
          Alleen ouders kunnen de catalogus beheren.
        </p>
      )}

      {sjablonen === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : sjablonen.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          Nog geen klusjes in de catalogus.
        </SectionCard>
      ) : (
        <SectionCard>
          <ul className="space-y-1">
            {sjablonen.map((sjabloon) =>
              bewerkId === sjabloon.id ? (
                <li key={sjabloon.id}>
                  <KlusSjabloonForm
                    initieel={{ titel: sjabloon.titel, icoon: sjabloon.icoon }}
                    bezig={bezig}
                    onOpslaan={(invoer) => bewerken(sjabloon.id, invoer)}
                    onAnnuleren={() => setBewerkId(null)}
                  />
                </li>
              ) : (
                <SjabloonRij
                  key={sjabloon.id}
                  sjabloon={sjabloon}
                  isOuder={isOuder}
                  onBewerk={() => setBewerkId(sjabloon.id)}
                  onVerwijder={() => void verwijderen(sjabloon)}
                />
              ),
            )}
          </ul>
        </SectionCard>
      )}
    </AppShell>
  );
}

function SjabloonRij({
  sjabloon,
  isOuder,
  onBewerk,
  onVerwijder,
}: {
  sjabloon: KlusSjabloon;
  isOuder: boolean;
  onBewerk: () => void;
  onVerwijder: () => void;
}) {
  const Icon = klusIcoon(sjabloon.icoon);
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-sm">{sjabloon.titel}</p>
      {isOuder && (
        <div className="flex shrink-0 gap-1">
          <button onClick={onBewerk} aria-label="Bewerken" className="text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onVerwijder}
            aria-label="Verwijderen"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}
