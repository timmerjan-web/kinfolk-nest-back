import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import {
  berekenStreak,
  listEigenFotos,
  signedUrl,
  type DagelijkseFoto,
} from "@/lib/dagelijksefoto";

export const Route = createFileRoute("/fotos")({
  head: () => ({ meta: [{ title: "Mijn foto's — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <FotosPage />
    </RequireGezin>
  ),
});

function FotosPage() {
  const { user } = useAuth();
  const [fotos, setFotos] = useState<DagelijkseFoto[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    listEigenFotos(user.id)
      .then((data) => {
        setFotos(data);
        setStreak(berekenStreak(data.map((f) => f.datum)));
      })
      .catch((err) => toast.error(foutTekst(err, "Foto's laden mislukt.")));
  }, [user]);

  useEffect(() => {
    if (!fotos) return;
    let actief = true;
    void (async () => {
      const paren = await Promise.all(
        fotos.map(async (f) => [f.id, await signedUrl(f.storage_pad)] as const),
      );
      if (!actief) return;
      const nieuw: Record<string, string> = {};
      for (const [id, url] of paren) if (url) nieuw[id] = url;
      setUrls(nieuw);
    })();
    return () => {
      actief = false;
    };
  }, [fotos]);

  return (
    <AppShell
      title="Mijn foto's"
      subtitle={streak > 0 ? `${streak} ${streak === 1 ? "dag" : "dagen"} op rij` : undefined}
    >
      {fotos === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : fotos.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          Nog geen foto's geplaatst — begin vandaag op de Vandaag-pagina.
        </SectionCard>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {fotos.map((f) => (
            <div key={f.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
              {urls[f.id] ? (
                <img
                  src={urls[f.id]}
                  alt={f.datum}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Flame className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
