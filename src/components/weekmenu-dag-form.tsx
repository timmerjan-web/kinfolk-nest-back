import { useMemo, useRef, useState, type FormEvent } from "react";
import { BookOpen, Search, X } from "lucide-react";
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
  const [lijstOpen, setLijstOpen] = useState(false);
  const sluitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resultaten = useMemo(() => {
    const q = titel.trim().toLowerCase();
    const matches = q
      ? recepten.filter((r) => r.titel.toLowerCase().includes(q))
      : recepten;
    return matches.slice(0, 8);
  }, [recepten, titel]);

  const openLijst = () => {
    if (sluitTimer.current) {
      clearTimeout(sluitTimer.current);
      sluitTimer.current = null;
    }
    setLijstOpen(true);
  };

  const sluitLijstLater = () => {
    if (sluitTimer.current) clearTimeout(sluitTimer.current);
    sluitTimer.current = setTimeout(() => setLijstOpen(false), 150);
  };

  const kiesRecept = (id: string) => {
    setReceptId(id);
    const gekozen = recepten.find((r) => r.id === id);
    if (gekozen) setTitel(gekozen.titel);
    setLijstOpen(false);
  };

  const ontkoppelRecept = () => {
    setReceptId("");
    setLijstOpen(false);
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
      {recepten.length > 0 && receptId && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-primary">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Uit het kookboek</span>
          </span>
          <button
            type="button"
            onClick={ontkoppelRecept}
            aria-label="Recept ontkoppelen"
            className="shrink-0 text-primary/70 hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="relative">
        <Label htmlFor="titel">Titel</Label>
        <div className="relative">
          <Input
            id="titel"
            required
            value={titel}
            onChange={(e) => {
              setTitel(e.target.value);
              setReceptId("");
              openLijst();
            }}
            onFocus={openLijst}
            onBlur={sluitLijstLater}
            onKeyDown={(e) => {
              if (e.key === "Escape") setLijstOpen(false);
            }}
            placeholder="Bv. Pasta met pesto"
            autoComplete="off"
            className="mt-1 pr-9"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {lijstOpen && resultaten.length > 0 && (
          <ul
            role="listbox"
            aria-label="Recepten uit het kookboek"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            {resultaten.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={r.id === receptId}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    kiesRecept(r.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-secondary" />
                  <span className="truncate">{r.titel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
