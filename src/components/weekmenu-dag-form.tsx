import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WeekmenuInvoer } from "@/lib/weekmenu";

const selectClass =
  "mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export function WeekmenuDagForm({
  initieel,
  leden,
  recepten,
  bezig,
  onOpslaan,
  onAnnuleren,
  onVerwijderen,
}: {
  initieel?: Partial<WeekmenuInvoer> | undefined;
  leden: { id: string; naam: string }[];
  recepten: { id: string; titel: string }[];
  bezig: boolean;
  onOpslaan: (invoer: WeekmenuInvoer) => void | Promise<void>;
  onAnnuleren: () => void;
  onVerwijderen?: (() => void | Promise<void>) | undefined;
}) {
  const [receptId, setReceptId] = useState(initieel?.recept_id ?? "");
  const [titel, setTitel] = useState(initieel?.titel ?? "");
  const [kok, setKok] = useState(initieel?.kok ?? "");
  const [notitie, setNotitie] = useState(initieel?.notitie ?? "");

  const kiesRecept = (id: string) => {
    setReceptId(id);
    const gekozen = recepten.find((r) => r.id === id);
    if (gekozen) setTitel(gekozen.titel);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onOpslaan({
      titel: titel.trim(),
      recept_id: receptId || null,
      kok: kok || null,
      notitie: notitie.trim() || null,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      {recepten.length > 0 && (
        <div>
          <Label htmlFor="recept">Uit het kookboek</Label>
          <select
            id="recept"
            value={receptId}
            onChange={(e) => kiesRecept(e.target.value)}
            className={selectClass}
          >
            <option value="">Geen — eigen titel hieronder</option>
            {recepten.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titel}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <Label htmlFor="titel">Titel</Label>
        <Input
          id="titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Bv. Pasta met pesto"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="kok">Wie kookt?</Label>
        <select
          id="kok"
          value={kok}
          onChange={(e) => setKok(e.target.value)}
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
      <div>
        <Label htmlFor="notitie">Notitie</Label>
        <Textarea
          id="notitie"
          value={notitie}
          onChange={(e) => setNotitie(e.target.value)}
          placeholder="Optioneel"
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={bezig || !titel.trim()} className="flex-1">
          {bezig ? "Bezig…" : "Opslaan"}
        </Button>
        <Button type="button" variant="ghost" onClick={onAnnuleren} disabled={bezig}>
          Annuleren
        </Button>
        {onVerwijderen && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onVerwijderen()}
            disabled={bezig}
          >
            Verwijderen
          </Button>
        )}
      </div>
    </form>
  );
}
