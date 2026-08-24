import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { RequireGezin } from "@/components/require-auth";

export const Route = createFileRoute("/klusjes")({
  head: () => ({ meta: [{ title: "Klusjes — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <PlaceholderPage title="Klusjes" fase="Fase 5" />
    </RequireGezin>
  ),
});
