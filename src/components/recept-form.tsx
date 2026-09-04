import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RECEPT_CATEGORIEEN, categorieLabel, type ReceptInvoer } from "@/lib/recepten";
import { kapitaliseer, naarRegels, naarTags } from "@/lib/tekst";

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
  const [categorie, setCategorie] = useState(initieel?.categorie ?? RECEPT_CATEGORIEEN[1]);
  const [beschrijving, setBeschrijving] = useState(initieel?.beschrijving ?? "");
  const [bereidingstijd, setBereidingstijd] = useState(
    initieel?.bereidingstijd_minuten != null ? String(initieel.bereidingstijd_minuten) : "",
  );
  const [porties, setPorties] = useState(initieel?.porties != null ? String(initieel.porties) : "");
  const [ingredienten, setIngredienten] = useState(
    initieel?.ingredienten && initieel.ingredienten.length > 0
      ? initieel.ingredienten.join("\n")
      : "",
  );
  const [stappen, setStappen] = useState(
    initieel?.stappen && initieel.stappen.length > 0 ? initieel.stappen.join("\n") : "",
  );
  const [tags, setTags] = useState(
    initieel?.tags && initieel.tags.length > 0 ? initieel.tags.join(", ") : "",
  );
  const [receptUrl, setReceptUrl] = useState(initieel?.recept_url ?? "");
  const [fout, setFout] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const ing = naarRegels(ingredienten);
    if (ing.length === 0) {
      setFout("Voeg minstens één ingrediënt toe (per regel).");
      return;
    }
    setFout(null);
    void onIndienen({
      titel: kapitaliseer(titel.trim()),
      categorie,
      beschrijving: beschrijving.trim() || null,
      bereidingstijd_minuten: bereidingstijd.trim() ? Number(bereidingstijd) : null,
      porties: porties.trim() ? Number(porties) : null,
      ingredienten: ing,
      stappen: naarRegels(stappen),
      tags: naarTags(tags),
      recept_url: receptUrl.trim() || null,
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
        <Label>Categorie</Label>
        <div className="mt-1 flex gap-2">
          {RECEPT_CATEGORIEEN.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategorie(c)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium capitalize ${
                categorie === c
                  ? "bg-primary text-primary-foreground"
                  : "border border-input text-muted-foreground"
              }`}
            >
              {categorieLabel(c)}
            </button>
          ))}
        </div>
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
        <Label htmlFor="ingredienten">Ingrediënten (één per regel)</Label>
        <Textarea
          id="ingredienten"
          required
          value={ingredienten}
          onChange={(e) => setIngredienten(e.target.value)}
          placeholder={"500 g gehakt\n1 ui\nSnuf zout"}
          rows={5}
          className="mt-1 font-mono text-sm"
        />
        {fout && <p className="mt-1 text-xs text-destructive">{fout}</p>}
      </div>

      <div>
        <Label htmlFor="stappen">Bereiding (één stap per regel)</Label>
        <Textarea
          id="stappen"
          value={stappen}
          onChange={(e) => setStappen(e.target.value)}
          placeholder={"Snijd de ui\nBak het gehakt\n…"}
          rows={5}
          className="mt-1 font-mono text-sm"
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (komma-gescheiden)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="vegetarisch, snel, kindvriendelijk"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="recept-url">Link naar origineel recept</Label>
        <Input
          id="recept-url"
          type="url"
          value={receptUrl}
          onChange={(e) => setReceptUrl(e.target.value)}
          placeholder="https://…"
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

      <Button type="submit" disabled={bezig || !titel.trim()} className="w-full">
        {bezig ? "Bezig…" : indienenLabel}
      </Button>
    </form>
  );
}
