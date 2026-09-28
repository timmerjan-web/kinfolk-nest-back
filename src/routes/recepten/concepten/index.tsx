import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ImagePlus, Inbox, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import { maakConceptVanScreenshot } from "@/lib/ocr";
import { deleteRecept, listConceptRecepten, type Recept } from "@/lib/recepten";

export const Route = createFileRoute("/recepten/concepten/")({
  head: () => ({ meta: [{ title: "Concept-wachtrij — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <ReceptWachtrijPage />
    </RequireGezin>
  ),
});

function ReceptWachtrijPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [concepten, setConcepten] = useState<Recept[] | null>(null);
  const [ocrBezig, setOcrBezig] = useState(false);

  useEffect(() => {
    listConceptRecepten()
      .then(setConcepten)
      .catch((err) => toast.error(foutTekst(err, "Concepten laden mislukt.")));
  }, []);

  const verwijderen = async (recept: Recept) => {
    setConcepten((huidig) => (huidig ?? []).filter((r) => r.id !== recept.id));
    try {
      await deleteRecept(recept.id);
      toast.success("Concept verwijderd.");
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      setConcepten((huidig) => [...(huidig ?? []), recept]);
    }
  };

  const verwerkScreenshot = async (bestand: File) => {
    if (!profile?.gezin_id || !user) return;
    setOcrBezig(true);
    try {
      const concept = await maakConceptVanScreenshot(bestand, profile.gezin_id, user.id);
      toast.success("Tekst herkend — controleer het concept.");
      navigate({ to: "/recepten/concepten/$receptId", params: { receptId: concept.id } });
    } catch (err) {
      toast.error(foutTekst(err, "Tekst herkennen mislukt."));
    } finally {
      setOcrBezig(false);
    }
  };

  return (
    <AppShell title="Concept-wachtrij" subtitle="Gedeeld, nog niet nagekeken" terug="/recepten">
      <SectionCard className="mb-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-background px-3 py-4 text-sm font-medium text-foreground hover:bg-muted">
          <ImagePlus className="h-4 w-4" />
          {ocrBezig ? "Bezig met tekst herkennen…" : "Screenshot toevoegen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={ocrBezig}
            onChange={(e) => {
              const bestand = e.target.files?.[0];
              e.target.value = "";
              if (bestand) void verwerkScreenshot(bestand);
            }}
          />
        </label>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Screenshot van een Instagram-post, story of reel met het recept erbij.
        </p>
      </SectionCard>

      {concepten === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : concepten.length === 0 ? (
        <SectionCard className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 opacity-50" />
          Niets in de wachtrij — voeg hierboven een screenshot toe.
        </SectionCard>
      ) : (
        <ul className="space-y-2">
          {concepten.map((recept) => (
            <WachtrijRij key={recept.id} recept={recept} onVerwijderen={verwijderen} />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function WachtrijRij({
  recept,
  onVerwijderen,
}: {
  recept: Recept;
  onVerwijderen: (recept: Recept) => void;
}) {
  const [bevestigen, setBevestigen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const klikVerwijderen = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bevestigen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onVerwijderen(recept);
      return;
    }
    setBevestigen(true);
    // Zonder auto-reset blijft een per ongeluk aangetikte knop voor altijd
    // op "Zeker?" staan — na 3s valt hij terug naar de neutrale stand.
    timerRef.current = setTimeout(() => setBevestigen(false), 3000);
  };

  return (
    <li>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <Link
          to="/recepten/concepten/$receptId"
          params={{ receptId: recept.id }}
          className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Inbox className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm leading-tight">{recept.titel || "(zonder titel)"}</p>
            {recept.bron && (
              <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                via {recept.bron}
              </p>
            )}
          </div>
        </Link>
        <button
          type="button"
          onClick={klikVerwijderen}
          aria-label={bevestigen ? "Verwijderen bevestigen" : "Concept verwijderen"}
          className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            bevestigen
              ? "bg-destructive text-destructive-foreground"
              : "text-muted-foreground hover:text-destructive"
          }`}
        >
          {bevestigen ? "Zeker?" : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </li>
  );
}
