import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Ingredient, ReceptInvoer } from "@/lib/recepten";

const LEEG_INGREDIENT: Ingredient = { naam: "", hoeveelheid: null, eenheid: null };

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
  const [ingredienten, setIngredienten] = useState<Ingredient[]>(
    initieel?.ingredienten && initieel.ingredienten.length > 0
      ? initieel.ingredienten
      : [{ ...LEEG_INGREDIENT }],
  );
  const [instructies, setInstructies] = useState(initieel?.instructies ?? "");

  const wijzigIngredient = (i: number, veld: keyof Ingredient, waarde: string) => {
    setIngredienten((huidig) =>
      huidig.map((ing, idx) => {
        if (idx !== i) return ing;
        if (veld === "hoeveelheid") return { ...ing, hoeveelheid: waarde.trim() ? Number(waarde) : null };
        if (veld === "eenheid") return { ...ing, eenheid: waarde.trim() || null };
        return { ...ing, naam: waarde };
      }),
    );
  };

  const verwijderIngredient = (i: number) => {
    setIngredienten((huidig) => huidig.filter((_, idx) => idx !== i));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onIndienen({
      titel: titel.trim(),
      beschrijving: beschrijving.trim() || null,
      bereidingstijd_minuten: bereidingstijd.trim() ? Number(bereidingstijd) : null,
      porties: porties.trim() ? Number(porties) : null,
      ingredienten: ingredienten
        .map((ing) => ({ ...ing, naam: ing.naam.trim() }))
        .filter((ing) => ing.naam !== ""),
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
        <Label>Ingrediënten</Label>
        <div className="mt-1 space-y-2">
          {ingredienten.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step="any"
                value={ing.hoeveelheid ?? ""}
                onChange={(e) => wijzigIngredient(i, "hoeveelheid", e.target.value)}
                placeholder="500"
                aria-label="Hoeveelheid"
                className="w-16 shrink-0"
              />
              <Input
                value={ing.eenheid ?? ""}
                onChange={(e) => wijzigIngredient(i, "eenheid", e.target.value)}
                placeholder="g"
                aria-label="Eenheid"
                className="w-16 shrink-0"
              />
              <Input
                value={ing.naam}
                onChange={(e) => wijzigIngredient(i, "naam", e.target.value)}
                placeholder="Gehakt"
                aria-label="Ingrediënt"
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => verwijderIngredient(i)}
                aria-label="Ingrediënt verwijderen"
                className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIngredienten((huidig) => [...huidig, { ...LEEG_INGREDIENT }])}
          className="mt-2"
        >
          <Plus className="h-4 w-4" /> Ingrediënt toevoegen
        </Button>
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
