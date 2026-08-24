import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KlusjeInvoer } from "@/lib/klusjes";

const selectClass =
  "mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export function KlusjeForm({
  leden,
  bezig,
  onOpslaan,
  onAnnuleren,
}: {
  leden: { id: string; naam: string }[];
  bezig: boolean;
  onOpslaan: (invoer: KlusjeInvoer) => void | Promise<void>;
  onAnnuleren: () => void;
}) {
  const [titel, setTitel] = useState("");
  const [deadline, setDeadline] = useState("");
  const [toegewezenAan, setToegewezenAan] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onOpslaan({
      titel: titel.trim(),
      deadline: deadline || null,
      toegewezen_aan: toegewezenAan || null,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      <div>
        <Label htmlFor="klusje-titel">Klusje</Label>
        <Input
          id="klusje-titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Bv. Vaatwasser uitruimen"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="klusje-deadline">Deadline</Label>
          <Input
            id="klusje-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1"
          />
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
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={bezig || !titel.trim()} className="flex-1">
          {bezig ? "Bezig…" : "Opslaan"}
        </Button>
        <Button type="button" variant="secondary" onClick={onAnnuleren} disabled={bezig}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
