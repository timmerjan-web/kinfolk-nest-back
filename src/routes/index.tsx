import { createFileRoute } from "@tanstack/react-router";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Vandaag — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <TodayPage />
    </RequireGezin>
  ),
});

function TodayPage() {
  const { profile } = useAuth();
  const uur = new Date().getHours();
  const groet = uur < 12 ? "Goedemorgen" : uur < 18 ? "Goedemiddag" : "Goedenavond";

  return (
    <AppShell title="Vandaag" subtitle={profile?.naam ? `${groet}, ${profile.naam}` : groet}>
      <SectionCard className="text-center">
        <p className="text-sm text-muted-foreground">
          Dit wordt het dagoverzicht: het weekmenu van vandaag, wie er kookt, klusjes met deadline
          vandaag, verjaardagen binnen de marge en de afspraken van vandaag.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Komt in Fase 7, zodra recepten, weekmenu, klusjes en agenda gebouwd zijn.
        </p>
      </SectionCard>
    </AppShell>
  );
}
