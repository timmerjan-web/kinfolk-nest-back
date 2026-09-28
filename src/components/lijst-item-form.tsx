import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LijstSoort } from "@/lib/lijstItems";

export function LijstItemForm({
  soort,
  bezig,
  onOpslaan,
  onAnnuleren,
}: {
  soort: LijstSoort;
  bezig: boolean;
  onOpslaan: (invoer: { titel: string; notitie: string | null }) => void | Promise<void>;
  onAnnuleren: () => void;
}) {
  const [titel, setTitel] = useState("");
  const [notitie, setNotitie] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!titel.trim()) return;
    void onOpslaan({ titel: titel.trim(), notitie: notitie.trim() || null });
    setTitel("");
    setNotitie("");
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      <div>
        <Label htmlFor="lijst-titel">
          {soort === "kijken" ? "Wat wil je kijken?" : "Wat wil je lezen?"}
        </Label>
        <Input
          id="lijst-titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={soort === "kijken" ? "Bv. Een film of serie" : "Bv. Een boek"}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="lijst-notitie">Notitie (optioneel)</Label>
        <Textarea
          id="lijst-notitie"
          value={notitie}
          onChange={(e) => setNotitie(e.target.value)}
          placeholder="Bv. een link, of van wie de tip komt"
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="secondary"
          disabled={bezig || !titel.trim()}
          className="flex-1"
        >
          {bezig ? "Bezig…" : "Toevoegen"}
        </Button>
        <Button type="button" variant="ghost" onClick={onAnnuleren} disabled={bezig}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
