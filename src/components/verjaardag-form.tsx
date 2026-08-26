import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VerjaardagInvoer } from "@/lib/verjaardagenContacten";

const MAANDEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function VerjaardagForm({
  initieel,
  bezig,
  onOpslaan,
  onAnnuleren,
}: {
  initieel?: VerjaardagInvoer;
  bezig: boolean;
  onOpslaan: (invoer: VerjaardagInvoer) => void | Promise<void>;
  onAnnuleren?: () => void;
}) {
  const [naam, setNaam] = useState(initieel?.naam ?? "");
  const [maand, setMaand] = useState(initieel?.maand ?? 1);
  const [dag, setDag] = useState(initieel?.dag ?? 1);
  const [geboortejaar, setGeboortejaar] = useState(
    initieel?.geboortejaar ? String(initieel.geboortejaar) : "",
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!naam.trim()) return;
    void onOpslaan({
      naam: naam.trim(),
      maand,
      dag,
      geboortejaar: geboortejaar ? Number(geboortejaar) : null,
    });
    if (!initieel) {
      setNaam("");
      setMaand(1);
      setDag(1);
      setGeboortejaar("");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      <div>
        <Label htmlFor="verjaardag-naam">Naam</Label>
        <Input
          id="verjaardag-naam"
          required
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Bv. Opa Jan"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label htmlFor="verjaardag-maand">Maand</Label>
          <select
            id="verjaardag-maand"
            value={maand}
            onChange={(e) => setMaand(Number(e.target.value))}
            className={`${selectClass} mt-1`}
          >
            {MAANDEN.map((naamMaand, i) => (
              <option key={naamMaand} value={i + 1}>
                {naamMaand}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="verjaardag-dag">Dag</Label>
          <Input
            id="verjaardag-dag"
            type="number"
            min={1}
            max={31}
            required
            value={dag}
            onChange={(e) => setDag(Number(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="verjaardag-jaar">Geboortejaar (optioneel)</Label>
        <Input
          id="verjaardag-jaar"
          type="number"
          min={1900}
          max={new Date().getFullYear()}
          value={geboortejaar}
          onChange={(e) => setGeboortejaar(e.target.value)}
          placeholder="Bv. 1955"
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={bezig || !naam.trim()} className="flex-1">
          {bezig ? "Bezig…" : "Opslaan"}
        </Button>
        {onAnnuleren && (
          <Button type="button" variant="secondary" onClick={onAnnuleren} disabled={bezig}>
            Annuleren
          </Button>
        )}
      </div>
    </form>
  );
}
