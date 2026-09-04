import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Minus, MoreVertical, Pencil, Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { ReceptForm } from "@/components/recept-form";
import { Button } from "@/components/ui/button";
import {
  deleteRecept,
  formatteerIngredient,
  getRecept,
  schaalHoeveelheid,
  updateRecept,
  type Recept,
  type ReceptInvoer,
} from "@/lib/recepten";
import { foutTekst } from "@/lib/errors";

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
  const [weergavePorties, setWeergavePorties] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getRecept(receptId)
      .then((data) => {
        setRecept(data);
        setWeergavePorties(data?.porties ?? null);
      })
      .catch((err) => toast.error(foutTekst(err, "Recept laden mislukt.")));
  }, [receptId]);

  const bijwerken = async (invoer: ReceptInvoer) => {
    setBezig(true);
    try {
      const bijgewerkt = await updateRecept(receptId, invoer);
      setRecept(bijgewerkt);
      setBewerken(false);
      toast.success("Recept bijgewerkt.");
    } catch (err) {
      toast.error(foutTekst(err, "Recept bijwerken mislukt."));
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
      toast.error(foutTekst(err, "Recept verwijderen mislukt."));
      setBezig(false);
    }
  };

  if (recept === undefined) {
    return (
      <AppShell title="Recept" terug="/recepten">
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      </AppShell>
    );
  }

  if (recept === null) {
    return (
      <AppShell title="Recept" terug="/recepten">
        <SectionCard className="text-center text-sm text-muted-foreground">
          Dit recept bestaat niet (meer).
        </SectionCard>
      </AppShell>
    );
  }

  if (bewerken) {
    return (
      <AppShell title="Recept bewerken" terug="/recepten">
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
      terug="/recepten"
      action={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBewerken(true)}
            aria-label="Bewerken"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Meer opties"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                className="surface-light absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border bg-card p-2 text-sm text-card-foreground shadow-elevated"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    void verwijderen();
                  }}
                  disabled={bezig}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-destructive hover:bg-muted disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Verwijderen
                </button>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
        {recept.bereidingstijd_minuten != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {recept.bereidingstijd_minuten} min
          </span>
        )}
        {recept.porties != null && weergavePorties != null && (
          <span className="flex items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5" />
            <button
              type="button"
              onClick={() => setWeergavePorties((p) => Math.max(1, (p ?? 1) - 1))}
              disabled={weergavePorties <= 1}
              aria-label="Minder porties"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[3ch] text-center font-medium text-foreground">
              {weergavePorties}
            </span>
            <button
              type="button"
              onClick={() => setWeergavePorties((p) => (p ?? 1) + 1)}
              aria-label="Meer porties"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border"
            >
              <Plus className="h-3 w-3" />
            </button>
            porties
          </span>
        )}
      </div>

      {recept.beschrijving && (
        <SectionCard className="mb-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Beschrijving
          </h2>
          <p className="text-sm text-muted-foreground">{recept.beschrijving}</p>
        </SectionCard>
      )}

      {recept.ingredienten.length > 0 && (
        <SectionCard className="mb-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ingrediënten
          </h2>
          <ul className="space-y-1 text-sm">
            {recept.ingredienten.map((ingredient, i) => {
              const ratio =
                recept.porties && weergavePorties ? weergavePorties / recept.porties : 1;
              const weergave =
                ingredient.hoeveelheid != null && ratio !== 1
                  ? { ...ingredient, hoeveelheid: schaalHoeveelheid(ingredient.hoeveelheid, ratio) }
                  : ingredient;
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {formatteerIngredient(weergave)}
                </li>
              );
            })}
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
