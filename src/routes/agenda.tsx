import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { AgendaForm } from "@/components/agenda-form";
import { BevestigDialog } from "@/components/bevestig-dialog";
import { PersoonBadge } from "@/components/persoon-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import {
  createAgendaItem,
  dagLabel,
  deleteAgendaItem,
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
  type ExterneAfspraak,
  type ExterneAgendaResultaat,
} from "@/lib/externeAgenda";
import {
  formatteerFracties,
  haalIvagoRonde,
  haalOphalingen,
  type WasteCollection,
} from "@/lib/ivago";
import { addDays, toDatumString } from "@/lib/weekmenu";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <AgendaPage />
    </RequireGezin>
  ),
});

type ExternAfspraakMetPersoon = ExterneAfspraak & { gebruiker_id: string; naam: string };
type WeergaveItem =
  | { soort: "eigen"; item: AgendaItem }
  | { soort: "extern"; afspraak: ExternAfspraakMetPersoon }
  | { soort: "afval"; ophaling: WasteCollection };

function sorteersleutel(wi: WeergaveItem): string {
  if (wi.soort === "eigen") return wi.item.tijd ?? "";
  if (wi.soort === "afval") return "";
  if (wi.afspraak.heleDag) return "";
  return new Date(wi.afspraak.start).toTimeString().slice(0, 8);
}

function AgendaPage() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<AgendaItem[] | null>(null);
  const [leden, setLeden] = useState<{ id: string; naam: string }[]>([]);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [koppelingen, setKoppelingen] = useState<AgendaKoppeling[]>([]);
  const [externeResultaten, setExterneResultaten] = useState<ExterneAgendaResultaat[] | null>(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalLabel, setIcalLabel] = useState("");
  const [koppelBezig, setKoppelBezig] = useState(false);
  const [koppelenOpen, setKoppelenOpen] = useState(false);
  const [teVerwijderen, setTeVerwijderen] = useState<AgendaItem | null>(null);
  const [verwijderBezig, setVerwijderBezig] = useState(false);
  const [teOntkoppelen, setTeOntkoppelen] = useState<AgendaKoppeling | null>(null);
  const [ontkoppelBezig, setOntkoppelBezig] = useState(false);
  const [ophalingen, setOphalingen] = useState<WasteCollection[]>([]);

  const laad = useCallback(() => {
    listAgenda()
      .then(setItems)
      .catch((err) => toast.error(foutTekst(err, "Agenda laden mislukt.")));
  }, []);

  useEffect(() => {
    laad();
  }, [laad]);

  useEffect(() => {
    if (!profile?.gezin_id) return;
    supabase
      .from("profiles")
      .select("id, naam")
      .eq("gezin_id", profile.gezin_id)
      .then(({ data }) => setLeden(data ?? []));
  }, [profile?.gezin_id]);

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

  useEffect(() => {
    if (!profile?.gezin_id) return;
    haalIvagoRonde(profile.gezin_id)
      .then((ronde) => {
        if (!ronde) return;
        const vanaf = toDatumString(addDays(new Date(), -7));
        const tot = toDatumString(addDays(new Date(), 120));
        return haalOphalingen(ronde, vanaf, tot).then(setOphalingen);
      })
      .catch(() => {});
  }, [profile?.gezin_id]);

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

  const ontkoppelen = async () => {
    if (!teOntkoppelen) return;
    const koppeling = teOntkoppelen;
    setOntkoppelBezig(true);
    try {
      await ontkoppelAgenda(koppeling.id);
      setKoppelingen((huidig) => huidig.filter((k) => k.id !== koppeling.id));
      setTeOntkoppelen(null);
      toast.success("Ontkoppeld.");
    } catch (err) {
      toast.error(foutTekst(err, "Ontkoppelen mislukt."));
    } finally {
      setOntkoppelBezig(false);
    }
  };

  const vandaag = toDatumString(new Date());
  const morgen = toDatumString(addDays(new Date(), 1));

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

  const verwijderen = async () => {
    if (!teVerwijderen) return;
    const item = teVerwijderen;
    setVerwijderBezig(true);
    try {
      await deleteAgendaItem(item.id);
      setItems((huidig) => (huidig ?? []).filter((i) => i.id !== item.id));
      setTeVerwijderen(null);
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
    } finally {
      setVerwijderBezig(false);
    }
  };

  const perDag = useMemo(() => {
    const kaart = new Map<string, WeergaveItem[]>();
    for (const item of items ?? []) {
      const lijst = kaart.get(item.datum) ?? [];
      lijst.push({ soort: "eigen", item });
      kaart.set(item.datum, lijst);
    }
    for (const r of externeResultaten ?? []) {
      for (const a of r.afspraken) {
        const datum = toDatumString(new Date(a.start));
        const lijst = kaart.get(datum) ?? [];
        lijst.push({
          soort: "extern",
          afspraak: { ...a, gebruiker_id: r.gebruiker_id, naam: r.naam },
        });
        kaart.set(datum, lijst);
      }
    }
    for (const ophaling of ophalingen) {
      const lijst = kaart.get(ophaling.datum) ?? [];
      lijst.push({ soort: "afval", ophaling });
      kaart.set(ophaling.datum, lijst);
    }
    for (const lijst of kaart.values()) {
      lijst.sort((a, b) => sorteersleutel(a).localeCompare(sorteersleutel(b)));
    }
    return kaart;
  }, [items, externeResultaten, ophalingen]);

  const datums = Array.from(perDag.keys()).sort();
  const aankomendDatums = datums.filter((d) => d >= vandaag);
  const verledenDatums = datums
    .filter((d) => d < vandaag)
    .sort()
    .reverse();

  return (
    <AppShell
      title="Agenda"
      subtitle="Voor het hele gezin"
      action={
        <button
          onClick={() => setNieuwOpen((o) => !o)}
          aria-label="Nieuwe afspraak"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
        >
          {nieuwOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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

      {items === null || externeResultaten === null ? (
        <SectionCard className="mb-3 text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : aankomendDatums.length === 0 && verledenDatums.length === 0 ? (
        <SectionCard className="mb-3 text-center text-sm text-muted-foreground">
          Nog geen afspraken.
        </SectionCard>
      ) : aankomendDatums.length === 0 ? (
        <SectionCard className="mb-3 text-center text-sm text-muted-foreground">
          Geen aankomende afspraken.
        </SectionCard>
      ) : (
        aankomendDatums.map((datum) => (
          <SectionCard key={datum} className="mb-3">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {dagLabel(datum, vandaag, morgen)}
            </h2>
            <ul className="space-y-1">
              {perDag
                .get(datum)!
                .map((wi, i) =>
                  wi.soort === "eigen" ? (
                    <AgendaRij
                      key={wi.item.id}
                      item={wi.item}
                      leden={leden}
                      onVerwijder={setTeVerwijderen}
                    />
                  ) : wi.soort === "afval" ? (
                    <AfvalRij key={`afval-${datum}`} ophaling={wi.ophaling} morgenStr={morgen} />
                  ) : (
                    <ExternRij key={`extern-${datum}-${i}`} afspraak={wi.afspraak} />
                  ),
                )}
            </ul>
          </SectionCard>
        ))
      )}

      {verledenDatums.length > 0 && (
        <SectionCard className="mb-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Verleden
          </h2>
          <ul className="space-y-1">
            {verledenDatums.flatMap((datum) =>
              perDag
                .get(datum)!
                .filter(
                  (wi): wi is Extract<WeergaveItem, { soort: "eigen" }> => wi.soort === "eigen",
                )
                .map((wi) => (
                  <AgendaRij
                    key={wi.item.id}
                    item={wi.item}
                    leden={leden}
                    onVerwijder={setTeVerwijderen}
                    verleden
                  />
                )),
            )}
          </ul>
        </SectionCard>
      )}

      <SectionCard>
        <button
          onClick={() => setKoppelenOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Externe agenda's koppelen
            {koppelingen.length > 0 && ` (${koppelingen.length})`}
          </span>
          {koppelenOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {koppelenOpen && (
          <div className="mt-2">
            {koppelingen.length > 0 && (
              <ul className="mb-2 space-y-1">
                {koppelingen.map((k) => (
                  <li key={k.id} className="flex items-center justify-between text-sm">
                    <span>{k.label || "Mijn agenda"}</span>
                    <button
                      onClick={() => setTeOntkoppelen(k)}
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
              <Button
                type="submit"
                variant="secondary"
                disabled={koppelBezig || !icalUrl.trim()}
                className="w-full"
              >
                {koppelBezig ? "Bezig…" : "Koppelen"}
              </Button>
            </form>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Te vinden in Google Calendar via Instellingen → jouw agenda → "Geheime adres in
              iCal-formaat".
            </p>
          </div>
        )}
      </SectionCard>

      <BevestigDialog
        open={teVerwijderen !== null}
        onOpenChange={(open) => !open && setTeVerwijderen(null)}
        titel={`Afspraak "${teVerwijderen?.titel}" verwijderen?`}
        beschrijving="Dit kan niet ongedaan gemaakt worden."
        bevestigLabel="Verwijderen"
        bezig={verwijderBezig}
        onBevestig={verwijderen}
      />

      <BevestigDialog
        open={teOntkoppelen !== null}
        onOpenChange={(open) => !open && setTeOntkoppelen(null)}
        titel={`Agenda "${teOntkoppelen?.label || "Mijn agenda"}" ontkoppelen?`}
        beschrijving="Je ziet de afspraken uit deze agenda dan niet meer in de app. Er verandert niets aan de agenda zelf."
        bevestigLabel="Ontkoppelen"
        bezig={ontkoppelBezig}
        onBevestig={ontkoppelen}
      />
    </AppShell>
  );
}

function AgendaRij({
  item,
  leden,
  onVerwijder,
  verleden = false,
}: {
  item: AgendaItem;
  leden: { id: string; naam: string }[];
  onVerwijder: (item: AgendaItem) => void;
  verleden?: boolean;
}) {
  const maker = item.created_by ? leden.find((l) => l.id === item.created_by) : undefined;
  return (
    <li className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
      {maker ? (
        <PersoonBadge naam={maker.naam} gebruikerId={maker.id} className="mt-0.5" />
      ) : (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${verleden ? "text-muted-foreground" : ""}`}>{item.titel}</p>
        <p className="text-[11px] text-muted-foreground">
          {item.tijd ? formatteerTijd(item.tijd) : "Hele dag"}
          {maker && ` · ${maker.naam}`}
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

function AfvalRij({ ophaling, morgenStr }: { ophaling: WasteCollection; morgenStr: string }) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-dashed border-border px-2 py-1.5">
      <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">Afvalophaling</p>
        <p className="text-[11px] text-muted-foreground">
          {formatteerFracties(ophaling.fracties)}
          {ophaling.datum === morgenStr && " — buitenzetten vanavond"}
        </p>
      </div>
    </li>
  );
}

function ExternRij({ afspraak }: { afspraak: ExternAfspraakMetPersoon }) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-dashed border-border px-2 py-1.5">
      <PersoonBadge naam={afspraak.naam} gebruikerId={afspraak.gebruiker_id} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{afspraak.titel}</p>
        <p className="text-[11px] text-muted-foreground">
          {afspraak.heleDag
            ? "Hele dag"
            : new Date(afspraak.start).toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
          {" · "}
          {afspraak.naam}
        </p>
      </div>
    </li>
  );
}
