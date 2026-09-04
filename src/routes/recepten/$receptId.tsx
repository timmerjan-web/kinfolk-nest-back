import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Clock,
  ExternalLink,
  MoreVertical,
  Pencil,
  ShoppingBasket,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { ReceptForm } from "@/components/recept-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { addItems } from "@/lib/boodschappen";
import { foutTekst } from "@/lib/errors";
import {
  categorieLabel,
  deleteRecept,
  getRecept,
  updateRecept,
  type Recept,
  type ReceptInvoer,
} from "@/lib/recepten";

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
  const { profile, user } = useAuth();
  const [recept, setRecept] = useState<Recept | null | undefined>(undefined);
  const [bewerken, setBewerken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aangevinkt, setAangevinkt] = useState<Set<number>>(new Set());
  const [toevoegenBezig, setToevoegenBezig] = useState(false);

  useEffect(() => {
    getRecept(receptId)
      .then((data) => {
        setRecept(data);
        setAangevinkt(new Set(data ? data.ingredienten.map((_, i) => i) : []));
      })
      .catch((err) => toast.error(foutTekst(err, "Recept laden mislukt.")));
  }, [receptId]);

  const bijwerken = async (invoer: ReceptInvoer) => {
    setBezig(true);
    try {
      const bijgewerkt = await updateRecept(receptId, invoer);
      setRecept(bijgewerkt);
      setAangevinkt(new Set(bijgewerkt.ingredienten.map((_, i) => i)));
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

  const toevoegenAanBoodschappen = async () => {
    if (!recept || !profile?.gezin_id || !user) return;
    const namen = recept.ingredienten.filter((_, i) => aangevinkt.has(i));
    if (namen.length === 0) {
      toast.info("Selecteer minstens één ingrediënt.");
      return;
    }
    setToevoegenBezig(true);
    try {
      await addItems(profile.gezin_id, user.id, namen);
      toast.success(
        `${namen.length} ${namen.length === 1 ? "item" : "items"} toegevoegd aan boodschappenlijst.`,
      );
    } catch (err) {
      toast.error(foutTekst(err, "Toevoegen mislukt."));
    } finally {
      setToevoegenBezig(false);
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
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-semibold capitalize text-foreground/80">
          {categorieLabel(recept.categorie)}
        </span>
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

      {recept.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {recept.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {recept.recept_url && (
        <a
          href={recept.recept_url}
          target="_blank"
          rel="noreferrer"
          className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" /> Bekijk origineel recept
        </a>
      )}

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
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ingrediënten
            </h2>
            <div className="flex gap-2 text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => setAangevinkt(new Set(recept.ingredienten.map((_, i) => i)))}
              >
                Alles
              </button>
              <button type="button" onClick={() => setAangevinkt(new Set())}>
                Geen
              </button>
            </div>
          </div>
          <ul className="space-y-1 text-sm">
            {recept.ingredienten.map((ingredient, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={aangevinkt.has(i)}
                    onChange={(e) =>
                      setAangevinkt((huidig) => {
                        const next = new Set(huidig);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        return next;
                      })
                    }
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>{ingredient}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            disabled={toevoegenBezig}
            onClick={() => void toevoegenAanBoodschappen()}
            className="mt-3 w-full"
          >
            <ShoppingBasket className="h-4 w-4" />
            {toevoegenBezig ? "Toevoegen…" : "Toevoegen aan boodschappenlijst"}
          </Button>
        </SectionCard>
      )}

      {recept.stappen.length > 0 && (
        <SectionCard>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bereidingswijze
          </h2>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {recept.stappen.map((stap, i) => (
              <li key={i}>{stap}</li>
            ))}
          </ol>
        </SectionCard>
      )}

      {!recept.beschrijving && recept.ingredienten.length === 0 && recept.stappen.length === 0 && (
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
