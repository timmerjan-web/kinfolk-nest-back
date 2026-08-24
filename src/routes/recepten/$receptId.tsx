import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { ReceptForm } from "@/components/recept-form";
import { Button } from "@/components/ui/button";
import { deleteRecept, getRecept, updateRecept, type Recept, type ReceptInvoer } from "@/lib/recepten";

export const Route = createFileRoute("/recepten/$receptId")({
  head: () => ({ meta: [{ title: "Recept — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <ReceptDetailPage />
    </RequireGezin>
  ),
});

function ReceptDetailPage() {
  const { receptId } = Route.useParams();
  const navigate = useNavigate();
  const [recept, setRecept] = useState<Recept | null | undefined>(undefined);
  const [bewerken, setBewerken] = useState(false);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    getRecept(receptId)
      .then(setRecept)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Recept laden mislukt."));
  }, [receptId]);

  const bijwerken = async (invoer: ReceptInvoer) => {
    setBezig(true);
    try {
      const bijgewerkt = await updateRecept(receptId, invoer);
      setRecept(bijgewerkt);
      setBewerken(false);
      toast.success("Recept bijgewerkt.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recept bijwerken mislukt.");
    } finally {
      setBezig(false);
    }
  };

  const verwijderen = async () => {
    if (!recept) return;
    if (!window.confirm(`"${recept.titel}" verwijderen?`)) return;
    setBezig(true);
    try {
      await deleteRecept(recept.id);
      toast.success("Recept verwijderd.");
      navigate({ to: "/recepten", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recept verwijderen mislukt.");
      setBezig(false);
    }
  };

  if (recept === undefined) {
    return (
      <AppShell title="Recept">
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      </AppShell>
    );
  }

  if (recept === null) {
    return (
      <AppShell title="Recept">
        <SectionCard className="text-center text-sm text-muted-foreground">
          Dit recept bestaat niet (meer).
        </SectionCard>
      </AppShell>
    );
  }

  if (bewerken) {
    return (
      <AppShell title="Recept bewerken">
        <ReceptForm
          initieel={recept}
          bezig={bezig}
          indienenLabel="Wijzigingen opslaan"
          onIndienen={bijwerken}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={recept.titel}
      action={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBewerken(true)}
            aria-label="Bewerken"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => void verwijderen()}
            disabled={bezig}
            aria-label="Verwijderen"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="mb-3 flex gap-3 text-xs text-muted-foreground">
        {recept.bereidingstijd_minuten != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {recept.bereidingstijd_minuten} min
          </span>
        )}
        {recept.porties != null && (
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" /> {recept.porties} porties
          </span>
        )}
      </div>

      {recept.beschrijving && (
        <SectionCard className="mb-3">
          <p className="text-sm text-muted-foreground">{recept.beschrijving}</p>
        </SectionCard>
      )}

      {recept.ingredienten.length > 0 && (
        <SectionCard className="mb-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ingrediënten
          </h2>
          <ul className="space-y-1 text-sm">
            {recept.ingredienten.map((ingredient, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {ingredient}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {recept.instructies && (
        <SectionCard>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bereidingswijze
          </h2>
          <p className="whitespace-pre-line text-sm">{recept.instructies}</p>
        </SectionCard>
      )}

      {!recept.beschrijving && recept.ingredienten.length === 0 && !recept.instructies && (
        <SectionCard className="text-center">
          <p className="text-sm text-muted-foreground">Nog geen details toegevoegd.</p>
          <Button variant="secondary" onClick={() => setBewerken(true)} className="mt-3">
            <Pencil className="h-4 w-4" /> Details toevoegen
          </Button>
        </SectionCard>
      )}
    </AppShell>
  );
}
