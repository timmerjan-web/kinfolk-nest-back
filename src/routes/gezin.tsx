import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { useAuth, type Rol } from "@/lib/auth";
import { maakUitnodigingAan } from "@/lib/household";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";

export const Route = createFileRoute("/gezin")({
  head: () => ({ meta: [{ title: "Gezin — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <GezinPage />
    </RequireGezin>
  ),
});

type Lid = { id: string; naam: string; rol: Rol };

function GezinPage() {
  const { profile } = useAuth();
  const [leden, setLeden] = useState<Lid[]>([]);
  const [gezinNaam, setGezinNaam] = useState<string>("");
  const [genererend, setGenererend] = useState<Rol | null>(null);
  const [laatsteCode, setLaatsteCode] = useState<{ code: string; rol: Rol } | null>(null);

  const laadGezin = useCallback(async () => {
    if (!profile?.gezin_id) return;
    const [{ data: ledenData }, { data: gezinData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, naam, rol")
        .eq("gezin_id", profile.gezin_id)
        .order("naam"),
      supabase.from("gezinnen").select("naam").eq("id", profile.gezin_id).maybeSingle(),
    ]);
    setLeden((ledenData as Lid[]) ?? []);
    setGezinNaam(gezinData?.naam ?? "");
  }, [profile?.gezin_id]);

  useEffect(() => {
    void laadGezin();
  }, [laadGezin]);

  const nodigUit = async (rol: Rol) => {
    setGenererend(rol);
    try {
      const code = await maakUitnodigingAan(rol);
      setLaatsteCode({ code, rol });
    } catch (err) {
      toast.error(foutTekst(err, "Uitnodiging maken mislukt."));
    } finally {
      setGenererend(null);
    }
  };

  const kopieer = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code gekopieerd.");
    } catch {
      toast.info(`Code: ${code}`);
    }
  };

  const isOuder = profile?.rol === "ouder";

  return (
    <AppShell title="Gezin" subtitle={gezinNaam || undefined}>
      <SectionCard className="mb-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Leden
        </h2>
        <ul className="space-y-2">
          {leden.map((lid) => (
            <li
              key={lid.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{lid.naam}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                {lid.rol}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {isOuder ? (
        <SectionCard>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Lid uitnodigen
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Maak een eenmalige code voor een nieuw gezinslid. Deel de code buiten de app om
            (WhatsApp, in persoon).
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={genererend !== null}
              onClick={() => void nodigUit("ouder")}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4" /> Ouder
            </Button>
            <Button
              variant="secondary"
              disabled={genererend !== null}
              onClick={() => void nodigUit("kind")}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4" /> Kind
            </Button>
          </div>

          {laatsteCode && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Code voor {laatsteCode.rol}
                </p>
                <p className="font-mono text-xl font-semibold tracking-widest">
                  {laatsteCode.code}
                </p>
              </div>
              <button
                onClick={() => void kopieer(laatsteCode.code)}
                aria-label="Kopieer code"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            Alleen ouders kunnen nieuwe leden uitnodigen.
          </p>
        </SectionCard>
      )}
    </AppShell>
  );
}
