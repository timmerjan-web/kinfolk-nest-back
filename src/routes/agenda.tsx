import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { AgendaForm } from "@/components/agenda-form";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import {
  createAgendaItem,
  deleteAgendaItem,
  formatteerDatum,
  formatteerTijd,
  listAgenda,
  type AgendaInvoer,
  type AgendaItem,
} from "@/lib/agenda";
import { toDatumString } from "@/lib/weekmenu";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <AgendaPage />
    </RequireGezin>
  ),
});

function AgendaPage() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<AgendaItem[] | null>(null);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [bezig, setBezig] = useState(false);

  const laad = useCallback(() => {
    listAgenda()
      .then(setItems)
      .catch((err) => toast.error(foutTekst(err, "Agenda laden mislukt.")));
  }, []);

  useEffect(() => {
    laad();
  }, [laad]);

  const vandaag = toDatumString(new Date());

  const toevoegen = async (invoer: AgendaInvoer) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      const item = await createAgendaItem(profile.gezin_id, user.id, invoer);
      setItems((huidig) => [...(huidig ?? []), item]);
      setNieuwOpen(false);
      toast.success("Afspraak toegevoegd.");
    } catch (err) {
      toast.error(foutTekst(err, "Afspraak toevoegen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const verwijderen = async (item: AgendaItem) => {
    setItems((huidig) => (huidig ?? []).filter((i) => i.id !== item.id));
    try {
      await deleteAgendaItem(item.id);
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      laad();
    }
  };

  const aankomend = (items ?? [])
    .filter((i) => i.datum >= vandaag)
    .sort((a, b) => a.datum.localeCompare(b.datum) || (a.tijd ?? "").localeCompare(b.tijd ?? ""));
  const verleden = (items ?? [])
    .filter((i) => i.datum < vandaag)
    .sort((a, b) => b.datum.localeCompare(a.datum) || (b.tijd ?? "").localeCompare(a.tijd ?? ""));

  return (
    <AppShell
      title="Agenda"
      subtitle="Voor het hele gezin"
      action={
        <button
          onClick={() => setNieuwOpen((o) => !o)}
          aria-label="Nieuwe afspraak"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          {nieuwOpen ? <X className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
        </button>
      }
    >
      {nieuwOpen && (
        <div className="mb-3">
          <AgendaForm
            standaardDatum={vandaag}
            bezig={bezig}
            onOpslaan={toevoegen}
            onAnnuleren={() => setNieuwOpen(false)}
          />
        </div>
      )}

      {items === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : aankomend.length === 0 && verleden.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          Nog geen afspraken.
        </SectionCard>
      ) : (
        <>
          {aankomend.length > 0 ? (
            <SectionCard className="mb-3">
              <ul className="space-y-1">
                {aankomend.map((item) => (
                  <AgendaRij key={item.id} item={item} onVerwijder={verwijderen} />
                ))}
              </ul>
            </SectionCard>
          ) : (
            <SectionCard className="mb-3 text-center text-sm text-muted-foreground">
              Geen aankomende afspraken.
            </SectionCard>
          )}

          {verleden.length > 0 && (
            <SectionCard>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Verleden
              </h2>
              <ul className="space-y-1">
                {verleden.map((item) => (
                  <AgendaRij key={item.id} item={item} onVerwijder={verwijderen} verleden />
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </AppShell>
  );
}

function AgendaRij({
  item,
  onVerwijder,
  verleden = false,
}: {
  item: AgendaItem;
  onVerwijder: (item: AgendaItem) => void;
  verleden?: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${verleden ? "text-muted-foreground" : ""}`}>{item.titel}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatteerDatum(item.datum)}
          {item.tijd && ` · ${formatteerTijd(item.tijd)}`}
        </p>
        {item.notitie && <p className="mt-0.5 text-[11px] text-muted-foreground">{item.notitie}</p>}
      </div>
      <button
        onClick={() => onVerwijder(item)}
        aria-label="Verwijderen"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
