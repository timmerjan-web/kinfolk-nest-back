import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AgendaInvoer } from "@/lib/agenda";

export function AgendaForm({
  standaardDatum,
  bezig,
  onOpslaan,
  onAnnuleren,
}: {
  standaardDatum: string;
  bezig: boolean;
  onOpslaan: (invoer: AgendaInvoer) => void | Promise<void>;
  onAnnuleren: () => void;
}) {
  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState(standaardDatum);
  const [tijd, setTijd] = useState("");
  const [notitie, setNotitie] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onOpslaan({
      titel: titel.trim(),
      datum,
      tijd: tijd || null,
      notitie: notitie.trim() || null,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      <div>
        <Label htmlFor="agenda-titel">Afspraak</Label>
        <Input
          id="agenda-titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Bv. Tandarts Lio"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="agenda-datum">Datum</Label>
          <Input
            id="agenda-datum"
            type="date"
            required
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="agenda-tijd">Tijd</Label>
          <Input
            id="agenda-tijd"
            type="time"
            value={tijd}
            onChange={(e) => setTijd(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="agenda-notitie">Notitie</Label>
        <Textarea
          id="agenda-notitie"
          value={notitie}
          onChange={(e) => setNotitie(e.target.value)}
          placeholder="Optioneel"
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={bezig || !titel.trim() || !datum} className="flex-1">
          {bezig ? "Bezig…" : "Opslaan"}
        </Button>
        <Button type="button" variant="secondary" onClick={onAnnuleren} disabled={bezig}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
