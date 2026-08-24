import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Clock, Plus, Search, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { listRecepten, type Recept } from "@/lib/recepten";
import { foutTekst } from "@/lib/errors";

export const Route = createFileRoute("/recepten/")({
  head: () => ({ meta: [{ title: "Recepten — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <ReceptenPage />
    </RequireGezin>
  ),
});

function ReceptenPage() {
  const [recepten, setRecepten] = useState<Recept[] | null>(null);
  const [zoek, setZoek] = useState("");

  useEffect(() => {
    listRecepten()
      .then(setRecepten)
      .catch((err) => toast.error(foutTekst(err, "Recepten laden mislukt.")));
  }, []);

  const gefilterd = (recepten ?? []).filter((r) =>
    r.titel.toLowerCase().includes(zoek.trim().toLowerCase()),
  );

  return (
    <AppShell
      title="Recepten"
      subtitle="Het gezinskookboek"
      action={
        <Link
          to="/recepten/nieuw"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          aria-label="Nieuw recept"
        >
          <Plus className="h-4 w-4" />
        </Link>
      }
    >
      {recepten !== null && recepten.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op titel…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

      {recepten === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : recepten.length === 0 ? (
        <SectionCard className="text-center">
          <ChefHat className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nog geen recepten. Voeg het eerste recept van het gezin toe.
          </p>
          <Link
            to="/recepten/nieuw"
            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Recept toevoegen
          </Link>
        </SectionCard>
      ) : gefilterd.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          Geen recepten gevonden voor "{zoek}".
        </SectionCard>
      ) : (
        <ul className="space-y-2">
          {gefilterd.map((recept) => (
            <li key={recept.id}>
              <Link
                to="/recepten/$receptId"
                params={{ receptId: recept.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card active:scale-[0.99]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ChefHat className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm leading-tight">{recept.titel}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                    {recept.bereidingstijd_minuten != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {recept.bereidingstijd_minuten} min
                      </span>
                    )}
                    {recept.porties != null && (
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" /> {recept.porties} porties
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
