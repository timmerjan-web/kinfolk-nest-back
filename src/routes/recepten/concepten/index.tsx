import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { foutTekst } from "@/lib/errors";
import { listConceptRecepten, type Recept } from "@/lib/recepten";

export const Route = createFileRoute("/recepten/concepten/")({
  head: () => ({ meta: [{ title: "Concept-wachtrij — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <ReceptWachtrijPage />
    </RequireGezin>
  ),
});

function ReceptWachtrijPage() {
  const [concepten, setConcepten] = useState<Recept[] | null>(null);

  useEffect(() => {
    listConceptRecepten()
      .then(setConcepten)
      .catch((err) => toast.error(foutTekst(err, "Concepten laden mislukt.")));
  }, []);

  return (
    <AppShell title="Concept-wachtrij" subtitle="Gedeeld, nog niet nagekeken" terug="/recepten">
      {concepten === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : concepten.length === 0 ? (
        <SectionCard className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 opacity-50" />
          Niets in de wachtrij — deel een post vanuit Instagram om een concept aan te maken.
        </SectionCard>
      ) : (
        <ul className="space-y-2">
          {concepten.map((recept) => (
            <li key={recept.id}>
              <Link
                to="/recepten/concepten/$receptId"
                params={{ receptId: recept.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card active:scale-[0.99]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Inbox className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm leading-tight">
                    {recept.titel || "(zonder titel)"}
                  </p>
                  {recept.bron && (
                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                      via {recept.bron}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
