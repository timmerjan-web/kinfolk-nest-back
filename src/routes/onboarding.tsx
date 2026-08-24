import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GezinsappLogo } from "@/components/logo";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { maakGezinAan, wordGezinslid } from "@/lib/household";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Gezin — Gezinsapp" }] }),
  component: () => (
    <RequireAuth>
      <OnboardingPage />
    </RequireAuth>
  ),
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [tab, setTab] = useState<"maken" | "aansluiten">("maken");
  const [naam, setNaam] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitMaken = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await maakGezinAan(naam);
      await refreshProfile();
      toast.success(`Gezin "${naam}" aangemaakt.`);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitAansluiten = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await wordGezinslid(code);
      await refreshProfile();
      toast.success("Je bent aangesloten bij het gezin.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <GezinsappLogo className="h-14 w-14 text-primary" />
          <h1 className="mt-3 font-display text-3xl">Bijna klaar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Maak een nieuw gezin aan, of sluit aan met een uitnodigingscode van een ouder.
          </p>
        </div>

        <div className="surface-light rounded-2xl bg-card p-5 text-card-foreground shadow-elevated">
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setTab("maken")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "maken" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Gezin aanmaken
            </button>
            <button
              type="button"
              onClick={() => setTab("aansluiten")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "aansluiten" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Aansluiten
            </button>
          </div>

          {tab === "maken" ? (
            <form onSubmit={submitMaken} className="space-y-3">
              <div>
                <Label htmlFor="gezinsnaam">Gezinsnaam</Label>
                <Input
                  id="gezinsnaam"
                  required
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Bv. Familie Timmer"
                  className="mt-1"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Bezig…" : "Gezin aanmaken"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Je wordt automatisch ouder van dit gezin en kan straks andere leden uitnodigen.
              </p>
            </form>
          ) : (
            <form onSubmit={submitAansluiten} className="space-y-3">
              <div>
                <Label htmlFor="code">Uitnodigingscode</Label>
                <Input
                  id="code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Bv. A1B2C3"
                  className="mt-1 font-mono tracking-widest"
                  maxLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Bezig…" : "Aansluiten"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Vraag de code aan een ouder in je gezin — zie de pagina "Gezin" in de app.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
