import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import { maakConceptVanScreenshot } from "@/lib/ocr";
import { parseRecept } from "@/lib/parseRecept";
import { createConceptRecept } from "@/lib/recepten";

export const Route = createFileRoute("/deel-ontvangen")({
  head: () => ({ meta: [{ title: "Delen verwerken — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <DeelOntvangenPage />
    </RequireGezin>
  ),
});

// Correspondeert met de cache-naam/-sleutel die de service worker
// gebruikt (src/sw.ts) om de onderschepte share_target-POST tijdelijk
// weg te zetten, tot deze pagina ze ophaalt.
const CACHE_NAAM = "deel-ontvangen";
const CACHE_SLEUTEL = "/deel-ontvangen-payload";

type GedeeldePayload = { title: string; text: string; url: string };

function DeelOntvangenPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [status, setStatus] = useState<"bezig" | "herkennen" | "leeg" | "fout">("bezig");

  useEffect(() => {
    if (!profile?.gezin_id || !user) return;
    let actief = true;

    (async () => {
      try {
        const cache = await caches.open(CACHE_NAAM);
        const response = await cache.match(CACHE_SLEUTEL);
        if (!response) {
          if (actief) setStatus("leeg");
          return;
        }
        await cache.delete(CACHE_SLEUTEL);
        const contentType = response.headers.get("Content-Type") ?? "";

        if (contentType.startsWith("image/")) {
          if (actief) setStatus("herkennen");
          const blob = await response.blob();
          const concept = await maakConceptVanScreenshot(blob, profile.gezin_id!, user.id);
          if (!actief) return;
          toast.success("Tekst herkend — controleer het concept.");
          navigate({
            to: "/recepten/concepten/$receptId",
            params: { receptId: concept.id },
            replace: true,
          });
          return;
        }

        const payload = (await response.json()) as GedeeldePayload;
        const ruweTekst = payload.text || payload.title || "";
        const geparsed = parseRecept(ruweTekst);
        const bronUrl = geparsed.url || payload.url || null;

        const concept = await createConceptRecept(profile.gezin_id!, user.id, {
          titel: geparsed.titel || payload.title || "Gedeeld recept",
          ...(geparsed.categorie ? { categorie: geparsed.categorie } : {}),
          bereidingstijd_minuten: geparsed.tijd_min,
          porties: geparsed.porties,
          ingredienten: geparsed.ingredienten,
          stappen: geparsed.bereiding,
          tags: geparsed.tags,
          recept_url: bronUrl,
          bron: "instagram",
          bron_url: bronUrl,
          ruwe_tekst: ruweTekst,
        });

        if (!actief) return;
        toast.success("Concept aangemaakt.");
        navigate({
          to: "/recepten/concepten/$receptId",
          params: { receptId: concept.id },
          replace: true,
        });
      } catch (err) {
        if (actief) {
          setStatus("fout");
          toast.error(foutTekst(err, "Verwerken van het gedeelde bestand mislukt."));
        }
      }
    })();

    return () => {
      actief = false;
    };
  }, [profile, user, navigate]);

  return (
    <AppShell title="Delen verwerken" terug="/recepten">
      <SectionCard className="text-center text-sm text-muted-foreground">
        {status === "bezig" && "Bezig met verwerken…"}
        {status === "herkennen" && "Bezig met tekst herkennen…"}
        {status === "leeg" &&
          "Geen gedeelde inhoud gevonden. Deel een screenshot opnieuw naar de app."}
        {status === "fout" && "Er ging iets mis bij het verwerken."}
      </SectionCard>
    </AppShell>
  );
}
