import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VerlanglijstInvoer } from "@/lib/verlanglijst";

export function VerlanglijstForm({
  bezig,
  onOpslaan,
  onAnnuleren,
}: {
  bezig: boolean;
  onOpslaan: (invoer: VerlanglijstInvoer) => void | Promise<void>;
  onAnnuleren: () => void;
}) {
  const [titel, setTitel] = useState("");
  const [url, setUrl] = useState("");
  const [prijs, setPrijs] = useState("");
  const [notitie, setNotitie] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!titel.trim()) return;
    void onOpslaan({
      titel: titel.trim(),
      url: url.trim() || null,
      prijs: prijs ? Number(prijs) : null,
      notitie: notitie.trim() || null,
    });
    setTitel("");
    setUrl("");
    setPrijs("");
    setNotitie("");
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      <div>
        <Label htmlFor="wens-titel">Wat wil je?</Label>
        <Input
          id="wens-titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Bv. Lego-set"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="wens-url">Link (optioneel)</Label>
        <Input
          id="wens-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="wens-prijs">Prijs (optioneel)</Label>
        <Input
          id="wens-prijs"
          type="number"
          min={0}
          step="0.01"
          value={prijs}
          onChange={(e) => setPrijs(e.target.value)}
          placeholder="€"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="wens-notitie">Notitie (optioneel)</Label>
        <Textarea
          id="wens-notitie"
          value={notitie}
          onChange={(e) => setNotitie(e.target.value)}
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={bezig || !titel.trim()} className="flex-1">
          {bezig ? "Bezig…" : "Toevoegen"}
        </Button>
        <Button type="button" variant="secondary" onClick={onAnnuleren} disabled={bezig}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
