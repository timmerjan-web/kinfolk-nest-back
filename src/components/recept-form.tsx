import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReceptInvoer } from "@/lib/recepten";

export function ReceptForm({
  initieel,
  bezig,
  indienenLabel,
  onIndienen,
}: {
  initieel?: Partial<ReceptInvoer>;
  bezig: boolean;
  indienenLabel: string;
  onIndienen: (invoer: ReceptInvoer) => void | Promise<void>;
}) {
  const [titel, setTitel] = useState(initieel?.titel ?? "");
  const [beschrijving, setBeschrijving] = useState(initieel?.beschrijving ?? "");
  const [bereidingstijd, setBereidingstijd] = useState(
    initieel?.bereidingstijd_minuten != null ? String(initieel.bereidingstijd_minuten) : "",
  );
  const [porties, setPorties] = useState(initieel?.porties != null ? String(initieel.porties) : "");
  const [ingredienten, setIngredienten] = useState((initieel?.ingredienten ?? []).join("\n"));
  const [instructies, setInstructies] = useState(initieel?.instructies ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onIndienen({
      titel: titel.trim(),
      beschrijving: beschrijving.trim() || null,
      bereidingstijd_minuten: bereidingstijd.trim() ? Number(bereidingstijd) : null,
      porties: porties.trim() ? Number(porties) : null,
      ingredienten: ingredienten
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      instructies: instructies.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="titel">Titel</Label>
        <Input
          id="titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Bv. Spaghetti bolognese"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="beschrijving">Korte beschrijving</Label>
        <Textarea
          id="beschrijving"
          value={beschrijving}
          onChange={(e) => setBeschrijving(e.target.value)}
          placeholder="Optioneel"
          rows={2}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bereidingstijd">Bereidingstijd (min)</Label>
          <Input
            id="bereidingstijd"
            type="number"
            min={0}
            value={bereidingstijd}
            onChange={(e) => setBereidingstijd(e.target.value)}
            placeholder="30"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="porties">Porties</Label>
          <Input
            id="porties"
            type="number"
            min={1}
            value={porties}
            onChange={(e) => setPorties(e.target.value)}
            placeholder="4"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ingredienten">Ingrediënten</Label>
        <Textarea
          id="ingredienten"
          value={ingredienten}
          onChange={(e) => setIngredienten(e.target.value)}
          placeholder={"Eén per regel, bv.\n500g gehakt\n1 ui\n2 tenen knoflook"}
          rows={5}
          className="mt-1 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">Eén ingrediënt per regel.</p>
      </div>

      <div>
        <Label htmlFor="instructies">Bereidingswijze</Label>
        <Textarea
          id="instructies"
          value={instructies}
          onChange={(e) => setInstructies(e.target.value)}
          placeholder="Stappen, optioneel genummerd"
          rows={6}
          className="mt-1"
        />
      </div>

      <Button type="submit" disabled={bezig || !titel.trim()} className="w-full">
        {bezig ? "Bezig…" : indienenLabel}
      </Button>
    </form>
  );
}
