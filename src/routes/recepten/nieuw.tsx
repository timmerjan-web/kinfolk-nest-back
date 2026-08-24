import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { ReceptForm } from "@/components/recept-form";
import { useAuth } from "@/lib/auth";
import { createRecept, type ReceptInvoer } from "@/lib/recepten";

export const Route = createFileRoute("/recepten/nieuw")({
  head: () => ({ meta: [{ title: "Nieuw recept — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <NieuwReceptPage />
    </RequireGezin>
  ),
});

function NieuwReceptPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [bezig, setBezig] = useState(false);

  const opslaan = async (invoer: ReceptInvoer) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      const recept = await createRecept(profile.gezin_id, user.id, invoer);
      toast.success(`"${recept.titel}" toegevoegd.`);
      navigate({ to: "/recepten/$receptId", params: { receptId: recept.id }, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recept opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  };

  return (
    <AppShell title="Nieuw recept">
      <ReceptForm bezig={bezig} indienenLabel="Recept opslaan" onIndienen={opslaan} />
    </AppShell>
  );
}
