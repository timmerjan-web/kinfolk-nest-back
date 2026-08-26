import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Cake, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { VerjaardagForm } from "@/components/verjaardag-form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import { dagenTotVerjaardag, formatteerVerjaardag, volgendeLeeftijd } from "@/lib/verjaardagen";
import {
  createVerjaardag,
  deleteVerjaardag,
  listVerjaardagen,
  updateVerjaardag,
  type VerjaardagContact,
  type VerjaardagInvoer,
} from "@/lib/verjaardagenContacten";

export const Route = createFileRoute("/verjaardagen")({
  head: () => ({ meta: [{ title: "Verjaardagen — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <VerjaardagenPage />
    </RequireGezin>
  ),
});

type Lid = { id: string; naam: string; geboortedatum: string | null };
type WeergaveRij = {
  key: string;
  naam: string;
  geboortedatum: string;
  geboortejaar: number | null;
  contact: VerjaardagContact | null;
};

function VerjaardagenPage() {
  const { profile, user } = useAuth();
  const [leden, setLeden] = useState<Lid[]>([]);
  const [contacten, setContacten] = useState<VerjaardagContact[] | null>(null);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [bewerkKey, setBewerkKey] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const laadContacten = useCallback(() => {
    listVerjaardagen()
      .then(setContacten)
      .catch((err) => toast.error(foutTekst(err, "Verjaardagen laden mislukt.")));
  }, []);

  useEffect(() => {
    laadContacten();
  }, [laadContacten]);

  useEffect(() => {
    if (!profile?.gezin_id) return;
    supabase
      .from("profiles")
      .select("id, naam, geboortedatum")
      .eq("gezin_id", profile.gezin_id)
      .then(({ data }) => setLeden(data ?? []));
  }, [profile?.gezin_id]);

  const toevoegen = async (invoer: VerjaardagInvoer) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      await createVerjaardag(profile.gezin_id, user.id, invoer);
      toast.success("Verjaardag toegevoegd.");
      setNieuwOpen(false);
      laadContacten();
    } catch (err) {
      toast.error(foutTekst(err, "Toevoegen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const bewerken = async (id: string, invoer: VerjaardagInvoer) => {
    setBezig(true);
    try {
      await updateVerjaardag(id, invoer);
      toast.success("Opgeslagen.");
      setBewerkKey(null);
      laadContacten();
    } catch (err) {
      toast.error(foutTekst(err, "Opslaan mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const verwijderen = async (contact: VerjaardagContact) => {
    setContacten((huidig) => (huidig ?? []).filter((c) => c.id !== contact.id));
    try {
      await deleteVerjaardag(contact.id);
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      laadContacten();
    }
  };

  const vandaag = new Date();

  const vanLeden: WeergaveRij[] = leden
    .filter((l): l is Lid & { geboortedatum: string } => !!l.geboortedatum)
    .map((l) => ({
      key: `lid-${l.id}`,
      naam: l.naam,
      geboortedatum: l.geboortedatum,
      geboortejaar: null,
      contact: null,
    }));
  const vanContacten: WeergaveRij[] = (contacten ?? []).map((c) => ({
    key: `contact-${c.id}`,
    naam: c.naam,
    geboortedatum: c.geboortedatum,
    geboortejaar: c.geboortejaar,
    contact: c,
  }));
  const rijen: WeergaveRij[] = [...vanLeden, ...vanContacten].sort(
    (a, b) =>
      dagenTotVerjaardag(a.geboortedatum, vandaag) - dagenTotVerjaardag(b.geboortedatum, vandaag),
  );

  return (
    <AppShell
      title="Verjaardagen"
      subtitle="Gezin, vrienden & familie"
      action={
        <button
          onClick={() => setNieuwOpen((o) => !o)}
          aria-label="Verjaardag toevoegen"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          {nieuwOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      }
    >
      {nieuwOpen && (
        <div className="mb-3">
          <VerjaardagForm
            bezig={bezig}
            onOpslaan={toevoegen}
            onAnnuleren={() => setNieuwOpen(false)}
          />
        </div>
      )}

      {contacten === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : rijen.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          Nog geen verjaardagen.
        </SectionCard>
      ) : (
        <SectionCard>
          <ul className="space-y-1">
            {rijen.map((rij) =>
              bewerkKey === rij.key && rij.contact ? (
                <li key={rij.key}>
                  <VerjaardagForm
                    initieel={{
                      naam: rij.contact.naam,
                      maand: Number(rij.contact.geboortedatum.split("-")[1]),
                      dag: Number(rij.contact.geboortedatum.split("-")[2]),
                      geboortejaar: rij.contact.geboortejaar,
                    }}
                    bezig={bezig}
                    onOpslaan={(invoer) => bewerken(rij.contact!.id, invoer)}
                    onAnnuleren={() => setBewerkKey(null)}
                  />
                </li>
              ) : (
                <li
                  key={rij.key}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
                >
                  <Cake className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{rij.naam}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatteerVerjaardag(rij.geboortedatum)}
                      {rij.geboortejaar &&
                        ` · wordt ${volgendeLeeftijd(rij.geboortejaar, rij.geboortedatum, vandaag)}`}
                      {dagenTotVerjaardag(rij.geboortedatum, vandaag) === 0 && " · vandaag!"}
                    </p>
                  </div>
                  {rij.contact && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setBewerkKey(rij.key)}
                        aria-label="Bewerken"
                        className="text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void verwijderen(rij.contact!)}
                        aria-label="Verwijderen"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        </SectionCard>
      )}
    </AppShell>
  );
}
