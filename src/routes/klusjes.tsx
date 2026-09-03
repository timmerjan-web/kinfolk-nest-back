import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { KlusjeForm } from "@/components/klusje-form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import {
  createKlusje,
  deleteKlusje,
  formatteerDeadline,
  formatteerTijd,
  listKlusjes,
  toggleAfgerond,
  type Klusje,
  type KlusjeInvoer,
} from "@/lib/klusjes";
import { listKlusSjablonen, type KlusSjabloon } from "@/lib/klusSjablonen";
import { toDatumString } from "@/lib/weekmenu";

export const Route = createFileRoute("/klusjes")({
  head: () => ({ meta: [{ title: "Klusjes — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <KlusjesPage />
    </RequireGezin>
  ),
});

function KlusjesPage() {
  const { profile, user } = useAuth();
  const [klusjes, setKlusjes] = useState<Klusje[] | null>(null);
  const [leden, setLeden] = useState<{ id: string; naam: string }[]>([]);
  const [sjablonen, setSjablonen] = useState<KlusSjabloon[]>([]);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [bezig, setBezig] = useState(false);

  const laad = useCallback(() => {
    listKlusjes()
      .then(setKlusjes)
      .catch((err) => toast.error(foutTekst(err, "Klusjes laden mislukt.")));
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
      .order("naam")
      .then(({ data }) => setLeden(data ?? []));
  }, [profile?.gezin_id]);

  useEffect(() => {
    listKlusSjablonen()
      .then(setSjablonen)
      .catch(() => setSjablonen([]));
  }, []);

  const toevoegen = async (invoer: KlusjeInvoer) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      const klusje = await createKlusje(profile.gezin_id, user.id, invoer);
      setKlusjes((huidig) => [...(huidig ?? []), klusje]);
      setNieuwOpen(false);
      toast.success("Klusje toegevoegd.");
    } catch (err) {
      toast.error(foutTekst(err, "Klusje toevoegen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const toggle = async (klusje: Klusje) => {
    if (!user || !profile?.gezin_id) return;
    const nieuw = !klusje.afgerond;

    if (nieuw && klusje.herhaling) {
      // Terugkerend: na afvinken meteen een nieuwe cyclus met een
      // nieuwe deadline — geen simpele optimistic flip, gewoon de
      // echte (gereset) rij ophalen.
      try {
        await toggleAfgerond(klusje, nieuw, profile.gezin_id, user.id);
        toast.success("Klusje afgerond — nieuwe cyclus ingepland.");
        laad();
      } catch (err) {
        toast.error(foutTekst(err, "Bijwerken mislukt."));
      }
      return;
    }

    setKlusjes((huidig) =>
      (huidig ?? []).map((k) => (k.id === klusje.id ? { ...k, afgerond: nieuw } : k)),
    );
    try {
      await toggleAfgerond(klusje, nieuw, profile.gezin_id, user.id);
    } catch (err) {
      toast.error(foutTekst(err, "Bijwerken mislukt."));
      setKlusjes((huidig) =>
        (huidig ?? []).map((k) => (k.id === klusje.id ? { ...k, afgerond: !nieuw } : k)),
      );
    }
  };

  const verwijderen = async (klusje: Klusje) => {
    setKlusjes((huidig) => (huidig ?? []).filter((k) => k.id !== klusje.id));
    try {
      await deleteKlusje(klusje.id);
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
      laad();
    }
  };

  const openstaand = (klusjes ?? []).filter((k) => !k.afgerond);
  const afgerond = (klusjes ?? []).filter((k) => k.afgerond);
  const vandaag = toDatumString(new Date());

  return (
    <AppShell
      title="Klusjes"
      subtitle="Voor het hele gezin"
      action={
        <button
          onClick={() => setNieuwOpen((o) => !o)}
          aria-label="Nieuw klusje"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          {nieuwOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      }
    >
      <div className="mb-3 text-right">
        <Link to="/klus-sjablonen" className="text-xs text-muted-foreground underline">
          Klussencatalogus beheren
        </Link>
      </div>

      {nieuwOpen && (
        <div className="mb-3">
          <KlusjeForm
            leden={leden}
            sjablonen={sjablonen}
            bezig={bezig}
            onOpslaan={toevoegen}
            onAnnuleren={() => setNieuwOpen(false)}
          />
        </div>
      )}

      {klusjes === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : openstaand.length === 0 && afgerond.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          Nog geen klusjes.
        </SectionCard>
      ) : (
        <>
          {openstaand.length > 0 && (
            <SectionCard className="mb-3">
              <ul className="space-y-1">
                {openstaand.map((klusje) => (
                  <KlusjeRij
                    key={klusje.id}
                    klusje={klusje}
                    leden={leden}
                    vandaag={vandaag}
                    onToggle={toggle}
                    onVerwijder={verwijderen}
                  />
                ))}
              </ul>
            </SectionCard>
          )}

          {afgerond.length > 0 && (
            <SectionCard>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Afgerond
              </h2>
              <ul className="space-y-1">
                {afgerond.map((klusje) => (
                  <KlusjeRij
                    key={klusje.id}
                    klusje={klusje}
                    leden={leden}
                    vandaag={vandaag}
                    onToggle={toggle}
                    onVerwijder={verwijderen}
                  />
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </AppShell>
  );
}

function KlusjeRij({
  klusje,
  leden,
  vandaag,
  onToggle,
  onVerwijder,
}: {
  klusje: Klusje;
  leden: { id: string; naam: string }[];
  vandaag: string;
  onToggle: (klusje: Klusje) => void;
  onVerwijder: (klusje: Klusje) => void;
}) {
  const naam = klusje.toegewezen_aan
    ? leden.find((l) => l.id === klusje.toegewezen_aan)?.naam
    : undefined;
  const teLaat = !klusje.afgerond && !!klusje.deadline && klusje.deadline < vandaag;
  const herhalingLabel =
    klusje.herhaling === "dagelijks"
      ? "Dagelijks"
      : klusje.herhaling === "wekelijks"
        ? "Wekelijks"
        : klusje.herhaling === "maandelijks"
          ? "Maandelijks"
          : undefined;

  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
      <button
        onClick={() => onToggle(klusje)}
        aria-label={klusje.afgerond ? "Zet terug als openstaand" : "Vink af"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          klusje.afgerond ? "border-primary bg-primary text-primary-foreground" : "border-input"
        }`}
      >
        {klusje.afgerond && <span className="text-[10px]">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${klusje.afgerond ? "text-muted-foreground line-through" : ""}`}>
          {klusje.titel}
        </p>
        {(klusje.deadline ?? naam ?? herhalingLabel) && (
          <p className={`text-[11px] ${teLaat ? "text-destructive" : "text-muted-foreground"}`}>
            {klusje.deadline && formatteerDeadline(klusje.deadline)}
            {klusje.deadline && klusje.deadline_tijd && ` om ${formatteerTijd(klusje.deadline_tijd)}`}
            {klusje.deadline && naam && " · "}
            {naam}
            {(klusje.deadline ?? naam) && herhalingLabel && " · "}
            {herhalingLabel}
          </p>
        )}
      </div>
      <button
        onClick={() => onVerwijder(klusje)}
        aria-label="Verwijderen"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
