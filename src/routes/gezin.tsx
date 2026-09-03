import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Copy, Gift, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PushInstellingen } from "@/components/push-instellingen";
import { refreshProfile, useAuth, type Rol } from "@/lib/auth";
import { maakUitnodigingAan } from "@/lib/household";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import { formatteerVerjaardag } from "@/lib/verjaardagen";

export const Route = createFileRoute("/gezin")({
  head: () => ({ meta: [{ title: "Gezin — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <GezinPage />
    </RequireGezin>
  ),
});

type Lid = { id: string; naam: string; rol: Rol; geboortedatum: string | null };

function GezinPage() {
  const { profile, user } = useAuth();
  const [leden, setLeden] = useState<Lid[]>([]);
  const [gezinNaam, setGezinNaam] = useState<string>("");
  const [genererend, setGenererend] = useState<Rol | null>(null);
  const [laatsteCode, setLaatsteCode] = useState<{ code: string; rol: Rol } | null>(null);
  const [eigenGeboortedatum, setEigenGeboortedatum] = useState("");
  const [opslaanBezig, setOpslaanBezig] = useState(false);
  const [eigenNaam, setEigenNaam] = useState("");
  const [naamOpslaanBezig, setNaamOpslaanBezig] = useState(false);
  const [bewerken, setBewerken] = useState(false);

  const laadGezin = useCallback(async () => {
    if (!profile?.gezin_id) return;
    const [{ data: ledenData }, { data: gezinData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, naam, rol, geboortedatum")
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

  useEffect(() => {
    const eigen = leden.find((l) => l.id === user?.id);
    setEigenGeboortedatum(eigen?.geboortedatum ?? "");
    setEigenNaam(eigen?.naam ?? "");
  }, [leden, user?.id]);

  const opslaanEigenGegevens = async () => {
    if (!user || !eigenNaam.trim()) return;
    setNaamOpslaanBezig(true);
    setOpslaanBezig(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ naam: eigenNaam.trim(), geboortedatum: eigenGeboortedatum || null })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Gegevens opgeslagen.");
      await refreshProfile();
      void laadGezin();
      setBewerken(false);
    } catch (err) {
      toast.error(foutTekst(err, "Opslaan mislukt."));
    } finally {
      setNaamOpslaanBezig(false);
      setOpslaanBezig(false);
    }
  };

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
      <Link
        to="/verlanglijst"
        className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-card hover:bg-muted"
      >
        <Gift className="h-4 w-4 text-muted-foreground" />
        Verlanglijstjes bekijken
      </Link>

      <SectionCard className="mb-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Leden
        </h2>
        <ul className="space-y-2">
          {leden.map((lid) => (
            <li key={lid.id} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{lid.naam}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {lid.rol}
                  </span>
                  {lid.id === user?.id && !bewerken && (
                    <button
                      onClick={() => setBewerken(true)}
                      aria-label="Naam en verjaardag bewerken"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {lid.id === user?.id ? (
                bewerken ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      value={eigenNaam}
                      onChange={(e) => setEigenNaam(e.target.value)}
                      placeholder="Jouw naam"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="date"
                      value={eigenGeboortedatum}
                      onChange={(e) => setEigenGeboortedatum(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={naamOpslaanBezig || opslaanBezig || !eigenNaam.trim()}
                        onClick={() => void opslaanEigenGegevens()}
                        className="flex-1"
                      >
                        {naamOpslaanBezig || opslaanBezig ? "Bezig…" : "Opslaan"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setBewerken(false)}>
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  lid.geboortedatum && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Verjaardag: {formatteerVerjaardag(lid.geboortedatum)}
                    </p>
                  )
                )
              ) : (
                lid.geboortedatum && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Verjaardag: {formatteerVerjaardag(lid.geboortedatum)}
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard className="mb-3">
        <PushInstellingen />
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
