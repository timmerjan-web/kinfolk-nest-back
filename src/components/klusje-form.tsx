import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Herhaling, KlusjeInvoer } from "@/lib/klusjes";
import type { KlusSjabloon } from "@/lib/klusSjablonen";

const selectClass =
  "mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

const HERHALING_OPTIES: { waarde: Herhaling | ""; label: string }[] = [
  { waarde: "", label: "Eenmalig" },
  { waarde: "dagelijks", label: "Dagelijks" },
  { waarde: "wekelijks", label: "Wekelijks" },
  { waarde: "maandelijks", label: "Maandelijks" },
];

export function KlusjeForm({
  leden,
  sjablonen,
  bezig,
  onOpslaan,
  onAnnuleren,
}: {
  leden: { id: string; naam: string }[];
  sjablonen: KlusSjabloon[];
  bezig: boolean;
  onOpslaan: (invoer: KlusjeInvoer) => void | Promise<void>;
  onAnnuleren: () => void;
}) {
  const [bron, setBron] = useState<"catalogus" | "adhoc">(
    sjablonen.length > 0 ? "catalogus" : "adhoc",
  );
  const [sjabloonId, setSjabloonId] = useState("");
  const [titel, setTitel] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineTijd, setDeadlineTijd] = useState("");
  const [herhaling, setHerhaling] = useState<Herhaling | "">("");
  const [toegewezenAan, setToegewezenAan] = useState("");

  useEffect(() => {
    if (bron !== "catalogus") return;
    const sjabloon = sjablonen.find((s) => s.id === sjabloonId);
    setHerhaling((sjabloon?.standaard_herhaling as Herhaling | null) ?? "");
  }, [sjabloonId, bron, sjablonen]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const gekozenSjabloon =
      bron === "catalogus" ? sjablonen.find((s) => s.id === sjabloonId) : undefined;
    const finaleTitel = bron === "catalogus" ? (gekozenSjabloon?.titel ?? "") : titel.trim();
    if (!finaleTitel) return;
    void onOpslaan({
      titel: finaleTitel,
      deadline: deadline || null,
      deadline_tijd: deadline && deadlineTijd ? deadlineTijd : null,
      toegewezen_aan: toegewezenAan || null,
      sjabloon_id: bron === "catalogus" ? sjabloonId || null : null,
      herhaling: herhaling || null,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      {sjablonen.length > 0 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={bron === "catalogus" ? "secondary" : "outline"}
            onClick={() => setBron("catalogus")}
            className="flex-1"
          >
            Uit catalogus
          </Button>
          <Button
            type="button"
            variant={bron === "adhoc" ? "secondary" : "outline"}
            onClick={() => setBron("adhoc")}
            className="flex-1"
          >
            Eenmalige klus
          </Button>
        </div>
      )}

      {bron === "catalogus" ? (
        <div>
          <Label htmlFor="klusje-sjabloon">Klus uit de catalogus</Label>
          <select
            id="klusje-sjabloon"
            required
            value={sjabloonId}
            onChange={(e) => setSjabloonId(e.target.value)}
            className={selectClass}
          >
            <option value="">Kies een klus…</option>
            {sjablonen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titel}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <Label htmlFor="klusje-titel">Klusje</Label>
          <Input
            id="klusje-titel"
            required
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Bv. Garage opruimen"
            className="mt-1"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="klusje-deadline">Datum</Label>
          <Input
            id="klusje-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="klusje-deadline-tijd">Tijd</Label>
          <Input
            id="klusje-deadline-tijd"
            type="time"
            value={deadlineTijd}
            onChange={(e) => setDeadlineTijd(e.target.value)}
            disabled={!deadline}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="klusje-herhaling">Herhaling</Label>
          <select
            id="klusje-herhaling"
            value={herhaling}
            onChange={(e) => setHerhaling(e.target.value as Herhaling | "")}
            className={selectClass}
          >
            {HERHALING_OPTIES.map((o) => (
              <option key={o.waarde} value={o.waarde}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="klusje-toegewezen">Wie doet het?</Label>
        <select
          id="klusje-toegewezen"
          value={toegewezenAan}
          onChange={(e) => setToegewezenAan(e.target.value)}
          className={selectClass}
        >
          <option value="">Nog niet bekend</option>
          {leden.map((l) => (
            <option key={l.id} value={l.id}>
              {l.naam}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          variant="secondary"
          disabled={bezig || (bron === "catalogus" ? !sjabloonId : !titel.trim())}
          className="flex-1"
        >
          {bezig ? "Bezig…" : "Opslaan"}
        </Button>
        <Button type="button" variant="ghost" onClick={onAnnuleren} disabled={bezig}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
