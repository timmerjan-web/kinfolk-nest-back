import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { AgendaForm } from "@/components/agenda-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  haalExterneAfspraken,
  koppelAgenda,
  listEigenKoppelingen,
  ontkoppelAgenda,
  type AgendaKoppeling,
  type ExterneAgendaResultaat,
} from "@/lib/externeAgenda";
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
  const [koppelingen, setKoppelingen] = useState<AgendaKoppeling[]>([]);
  const [externeResultaten, setExterneResultaten] = useState<ExterneAgendaResultaat[] | null>(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalLabel, setIcalLabel] = useState("");
  const [koppelBezig, setKoppelBezig] = useState(false);

  const laad = useCallback(() => {
    listAgenda()
      .then(setItems)
      .catch((err) => toast.error(foutTekst(err, "Agenda laden mislukt.")));
  }, []);

  useEffect(() => {
    laad();
  }, [laad]);

  useEffect(() => {
    if (!user) return;
    listEigenKoppelingen(user.id)
      .then(setKoppelingen)
      .catch(() => setKoppelingen([]));
  }, [user]);

  const laadExtern = useCallback(() => {
    haalExterneAfspraken()
      .then(setExterneResultaten)
      .catch((err) => {
        toast.error(foutTekst(err, "Externe agenda's ophalen mislukt."));
        setExterneResultaten([]);
      });
  }, []);

  useEffect(() => {
    laadExtern();
  }, [laadExtern, koppelingen.length]);

  const koppelen = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.gezin_id || !user || !icalUrl.trim()) return;
    setKoppelBezig(true);
    try {
      const nieuw = await koppelAgenda(profile.gezin_id, user.id, icalUrl.trim(), icalLabel.trim());
      setKoppelingen((huidig) => [...huidig, nieuw]);
      setIcalUrl("");
      setIcalLabel("");
      toast.success("Agenda gekoppeld.");
    } catch (err) {
      toast.error(foutTekst(err, "Koppelen mislukt."));
    } finally {
      setKoppelBezig(false);
    }
  };

  const ontkoppelen = async (koppeling: AgendaKoppeling) => {
    setKoppelingen((huidig) => huidig.filter((k) => k.id !== koppeling.id));
    try {
      await ontkoppelAgenda(koppeling.id);
    } catch (err) {
      toast.error(foutTekst(err, "Ontkoppelen mislukt."));
    }
  };

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
            <SectionCard className="mb-3">
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

      {externeResultaten && externeResultaten.some((r) => r.afspraken.length > 0) && (
        <SectionCard className="mb-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Van gekoppelde agenda's
          </h2>
          <ul className="space-y-1">
            {externeResultaten
              .flatMap((r) => r.afspraken.map((a) => ({ ...a, naam: r.naam })))
              .sort((a, b) => a.start.localeCompare(b.start))
              .slice(0, 20)
              .map((a, i) => (
                <li key={i} className="text-sm">
                  <span className="text-muted-foreground">{a.naam}:</span> {a.titel}
                  <span className="text-[11px] text-muted-foreground">
                    {" "}
                    —{" "}
                    {new Date(a.start).toLocaleDateString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {!a.heleDag &&
                      ` ${new Date(a.start).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`}
                  </span>
                </li>
              ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Externe agenda's koppelen
        </h2>
        {koppelingen.length > 0 && (
          <ul className="mb-2 space-y-1">
            {koppelingen.map((k) => (
              <li key={k.id} className="flex items-center justify-between text-sm">
                <span>{k.label || "Mijn agenda"}</span>
                <button
                  onClick={() => void ontkoppelen(k)}
                  aria-label="Ontkoppelen"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {externeResultaten
          ?.filter((r) => r.fout)
          .map((r) => (
            <p key={r.gebruiker_id} className="mb-2 text-[11px] text-destructive">
              {r.naam}: {r.fout}
            </p>
          ))}
        <form onSubmit={(e) => void koppelen(e)} className="space-y-2">
          <Input
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="Geheime iCal-URL (bv. van Google Calendar)"
          />
          <Input
            value={icalLabel}
            onChange={(e) => setIcalLabel(e.target.value)}
            placeholder="Naam (optioneel, bv. 'Werk')"
          />
          <Button type="submit" disabled={koppelBezig || !icalUrl.trim()} className="w-full">
            {koppelBezig ? "Bezig…" : "Koppelen"}
          </Button>
        </form>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Te vinden in Google Calendar via Instellingen → jouw agenda → "Geheime adres in
          iCal-formaat".
        </p>
      </SectionCard>
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
