import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { RequireGezin } from "@/components/require-auth";

export const Route = createFileRoute("/weekmenu")({
  head: () => ({ meta: [{ title: "Weekmenu — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <PlaceholderPage title="Weekmenu" fase="Fase 3" />
    </RequireGezin>
  ),
});
