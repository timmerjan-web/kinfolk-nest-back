import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import { createRecepten, listRecepten } from "@/lib/recepten";
import { parseReceptenBestand, type ImportRij } from "@/lib/receptImport";

export const Route = createFileRoute("/recepten/import")({
  head: () => ({ meta: [{ title: "Recepten importeren — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <ReceptImportPage />
    </RequireGezin>
  ),
});

type RijStatus = { geselecteerd: boolean; actieBijDubbel: "overslaan" | "toevoegen" };
const STANDAARD_STATUS: RijStatus = { geselecteerd: false, actieBijDubbel: "overslaan" };

function ReceptImportPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [rijen, setRijen] = useState<ImportRij[] | null>(null);
  const [headerFouten, setHeaderFouten] = useState<string[]>([]);
  const [status, setStatus] = useState<Record<number, RijStatus>>({});
  const [laden, setLaden] = useState(false);
  const [importeren, setImporteren] = useState(false);

  const verwerkBestand = async (bestand: File) => {
    if (!profile?.gezin_id) return;
    setLaden(true);
    setRijen(null);
    setHeaderFouten([]);
    try {
      const bestaande = await listRecepten();
      const bestaandeTitels = new Set(bestaande.map((r) => r.titel.trim().toLowerCase()));
      const resultaat = await parseReceptenBestand(bestand, bestaandeTitels);
      if (resultaat.headerFouten.length > 0) {
        setHeaderFouten(resultaat.headerFouten);
        return;
      }
      setRijen(resultaat.rijen);
      const nieuweStatus: Record<number, RijStatus> = {};
      for (const rij of resultaat.rijen) {
        nieuweStatus[rij.rijnummer] = {
          geselecteerd: rij.fouten.length === 0,
          actieBijDubbel: "overslaan",
        };
      }
      setStatus(nieuweStatus);
    } catch (err) {
      toast.error(foutTekst(err, "Bestand lezen mislukt. Is het een geldig .xlsx-bestand?"));
    } finally {
      setLaden(false);
    }
  };

  const importeerbaar = useMemo(() => {
    if (!rijen) return [];
    return rijen.filter((rij) => {
      const s = status[rij.rijnummer];
      if (!s?.geselecteerd || !rij.invoer) return false;
      if (rij.dubbel && s.actieBijDubbel === "overslaan") return false;
      return true;
    });
  }, [rijen, status]);

  const startImport = async () => {
    if (!profile?.gezin_id || !user || importeerbaar.length === 0) return;
    setImporteren(true);
    try {
      const invoerLijst = importeerbaar.map((rij) => rij.invoer!);
      const geimporteerd = await createRecepten(profile.gezin_id, user.id, invoerLijst);
      toast.success(
        `${geimporteerd.length} ${geimporteerd.length === 1 ? "recept" : "recepten"} geïmporteerd.`,
      );
      navigate({ to: "/recepten", replace: true });
    } catch (err) {
      toast.error(foutTekst(err, "Importeren mislukt."));
    } finally {
      setImporteren(false);
    }
  };

  if (profile && profile.rol !== "ouder") {
    return (
      <AppShell title="Recepten importeren" terug="/recepten">
        <SectionCard className="text-center text-sm text-muted-foreground">
          Alleen ouders kunnen recepten in bulk importeren.
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell title="Recepten importeren" terug="/recepten">
      <SectionCard className="mb-3">
        <p className="mb-3 text-sm text-muted-foreground">
          Kies een .xlsx-bestand met een tabblad "Recepten" en de kolommen titel, categorie,
          porties, tijd_min, ingredienten, bereiding, tags, url. Ingrediënten en bereiding: één per
          regel in de cel.
        </p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-background px-3 py-4 text-sm font-medium text-foreground hover:bg-muted">
          <Upload className="h-4 w-4" />
          {laden ? "Bezig met lezen…" : "Kies .xlsx-bestand"}
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            disabled={laden}
            onChange={(e) => {
              const bestand = e.target.files?.[0];
              e.target.value = "";
              if (bestand) void verwerkBestand(bestand);
            }}
          />
        </label>
      </SectionCard>

      {headerFouten.length > 0 && (
        <SectionCard className="mb-3 border-destructive/40">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Dit bestand kan niet gelezen worden:</p>
              <ul className="mt-1 list-inside list-disc">
                {headerFouten.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      )}

      {rijen && (
        <>
          <SectionCard className="mb-3 flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span>
              {rijen.length} {rijen.length === 1 ? "rij" : "rijen"} gevonden ·{" "}
              <span className="font-medium text-foreground">{importeerbaar.length}</span> klaar om
              te importeren
            </span>
          </SectionCard>

          <ul className="mb-3 space-y-2">
            {rijen.map((rij) => {
              const s = status[rij.rijnummer];
              return (
                <li key={rij.rijnummer}>
                  <SectionCard className={rij.fouten.length > 0 ? "border-destructive/40" : ""}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={s?.geselecteerd ?? false}
                        onChange={(e) =>
                          setStatus((huidig) => ({
                            ...huidig,
                            [rij.rijnummer]: {
                              ...(huidig[rij.rijnummer] ?? STANDAARD_STATUS),
                              geselecteerd: e.target.checked,
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Rij {rij.rijnummer}</p>
                        <p className="font-display text-sm leading-tight">
                          {rij.titel || "(geen titel)"}
                        </p>
                        {rij.invoer && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {rij.invoer.categorie} · {rij.invoer.porties} porties
                            {rij.invoer.bereidingstijd_minuten != null &&
                              ` · ${rij.invoer.bereidingstijd_minuten} min`}{" "}
                            · {rij.invoer.ingredienten.length} ingrediënten
                          </p>
                        )}
                        {rij.fouten.length > 0 && (
                          <ul className="mt-1 list-inside list-disc text-[11px] text-destructive">
                            {rij.fouten.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        )}
                        {rij.dubbel && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <AlertTriangle className="h-3 w-3" /> Bestaat al
                            </span>
                            <div className="flex gap-1">
                              {(["overslaan", "toevoegen"] as const).map((optie) => (
                                <button
                                  key={optie}
                                  type="button"
                                  onClick={() =>
                                    setStatus((huidig) => ({
                                      ...huidig,
                                      [rij.rijnummer]: {
                                        ...(huidig[rij.rijnummer] ?? STANDAARD_STATUS),
                                        actieBijDubbel: optie,
                                      },
                                    }))
                                  }
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    s?.actieBijDubbel === optie
                                      ? "bg-primary text-primary-foreground"
                                      : "border border-border text-muted-foreground"
                                  }`}
                                >
                                  {optie === "overslaan" ? "Overslaan" : "Toch toevoegen"}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                </li>
              );
            })}
          </ul>

          <Button
            variant="secondary"
            disabled={importeerbaar.length === 0 || importeren}
            onClick={() => void startImport()}
            className="w-full"
          >
            {importeren
              ? "Bezig…"
              : `Importeren (${importeerbaar.length} ${importeerbaar.length === 1 ? "recept" : "recepten"})`}
          </Button>
        </>
      )}
    </AppShell>
  );
}
