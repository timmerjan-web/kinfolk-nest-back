import { AppShell, SectionCard } from "@/components/app-shell";

export function PlaceholderPage({ title, fase }: { title: string; fase: string }) {
  return (
    <AppShell title={title}>
      <SectionCard className="text-center">
        <p className="text-sm text-muted-foreground">Deze module volgt in {fase}.</p>
      </SectionCard>
    </AppShell>
  );
}
