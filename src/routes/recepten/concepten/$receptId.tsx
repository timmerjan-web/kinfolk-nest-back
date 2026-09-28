import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { ReceptForm } from "@/components/recept-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { foutTekst } from "@/lib/errors";
import { parseRecept } from "@/lib/parseRecept";
import {
  getRecept,
  publiceerRecept,
  updateRecept,
  type Recept,
  type ReceptInvoer,
} from "@/lib/recepten";

export const Route = createFileRoute("/recepten/concepten/$receptId")({
  head: () => ({ meta: [{ title: "Concept — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <ReceptConceptPage />
    </RequireGezin>
  ),
});

function ReceptConceptPage() {
  const { receptId } = Route.useParams();
  const navigate = useNavigate();
  const [recept, setRecept] = useState<Recept | null | undefined>(undefined);
  const [herverwerkt, setHerverwerkt] = useState<Partial<ReceptInvoer> | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [plakTekst, setPlakTekst] = useState("");
  const [plakPaneelOpen, setPlakPaneelOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [publiceerBezig, setPubliceerBezig] = useState(false);

  useEffect(() => {
    getRecept(receptId)
      .then(setRecept)
      .catch((err) => toast.error(foutTekst(err, "Concept laden mislukt.")));
  }, [receptId]);

  const opslaan = async (invoer: ReceptInvoer) => {
    setBezig(true);
    try {
      const bijgewerkt = await updateRecept(receptId, invoer);
      setRecept(bijgewerkt);
      toast.success("Concept opgeslagen.");
    } catch (err) {
      toast.error(foutTekst(err, "Opslaan mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const publiceren = async (invoer: ReceptInvoer) => {
    setPubliceerBezig(true);
    try {
      const gepubliceerd = await publiceerRecept(receptId, invoer);
      toast.success(`"${gepubliceerd.titel}" gepubliceerd.`);
      navigate({ to: "/recepten/$receptId", params: { receptId: gepubliceerd.id }, replace: true });
    } catch (err) {
      toast.error(foutTekst(err, "Publiceren mislukt."));
    } finally {
      setPubliceerBezig(false);
    }
  };

  const opnieuwVerwerken = () => {
    if (!plakTekst.trim()) return;
    const geparsed = parseRecept(plakTekst);
    setHerverwerkt({
      titel: geparsed.titel,
      ...(geparsed.categorie ? { categorie: geparsed.categorie } : {}),
      bereidingstijd_minuten: geparsed.tijd_min,
      porties: geparsed.porties,
      ingredienten: geparsed.ingredienten,
      stappen: geparsed.bereiding,
      tags: geparsed.tags,
      recept_url: geparsed.url,
    });
    setFormKey((k) => k + 1);
    setPlakPaneelOpen(false);
    setPlakTekst("");
    toast.success("Tekst opnieuw verwerkt — controleer de velden hieronder.");
  };

  if (recept === undefined) {
    return (
      <AppShell title="Concept" terug="/recepten/concepten">
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      </AppShell>
    );
  }

  if (recept === null) {
    return (
      <AppShell title="Concept" terug="/recepten/concepten">
        <SectionCard className="text-center text-sm text-muted-foreground">
          Dit concept bestaat niet (meer).
        </SectionCard>
      </AppShell>
    );
  }

  if (recept.status !== "concept") {
    return (
      <AppShell title="Concept" terug="/recepten/concepten">
        <SectionCard className="text-center text-sm text-muted-foreground">
          Dit is al gepubliceerd.{" "}
          <a href={`/recepten/${recept.id}`} className="underline">
            Bekijk het recept
          </a>
          .
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={herverwerkt?.titel || recept.titel || "Nieuw concept"}
      terug="/recepten/concepten"
    >
      <SectionCard className="mb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {recept.bron && <span className="capitalize">Gedeeld via {recept.bron}</span>}
          {recept.bron_url && (
            <a
              href={recept.bron_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary underline"
            >
              <ExternalLink className="h-3 w-3" /> Origineel bekijken
            </a>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPlakPaneelOpen((o) => !o)}
          className="mt-2"
        >
          <Wand2 className="h-4 w-4" /> Tekst plakken &amp; opnieuw verwerken
        </Button>
        {plakPaneelOpen && (
          <div className="mt-2 space-y-2">
            <Textarea
              value={plakTekst}
              onChange={(e) => setPlakTekst(e.target.value)}
              placeholder="Plak hier het volledige bijschrift (handig bij reels zonder meegestuurde tekst)…"
              rows={6}
              className="font-mono text-sm"
            />
            <Button type="button" disabled={!plakTekst.trim()} onClick={opnieuwVerwerken}>
              Verwerken
            </Button>
          </div>
        )}
      </SectionCard>

      <ReceptForm
        key={formKey}
        initieel={herverwerkt ?? recept}
        bezig={bezig}
        indienenLabel="Opslaan"
        onIndienen={opslaan}
        tweedeActie={{ label: "Publiceren", bezig: publiceerBezig, onIndienen: publiceren }}
      />
    </AppShell>
  );
}
