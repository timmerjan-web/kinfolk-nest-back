import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KLUS_ICONEN } from "@/lib/klusIconen";
import type { KlusSjabloonInvoer } from "@/lib/klusSjablonen";
import { kapitaliseer } from "@/lib/tekst";

export function KlusSjabloonForm({
  initieel,
  bezig,
  onOpslaan,
  onAnnuleren,
}: {
  initieel?: KlusSjabloonInvoer;
  bezig: boolean;
  onOpslaan: (invoer: KlusSjabloonInvoer) => void | Promise<void>;
  onAnnuleren?: () => void;
}) {
  const [titel, setTitel] = useState(initieel?.titel ?? "");
  const [icoon, setIcoon] = useState(initieel?.icoon ?? "ListChecks");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!titel.trim()) return;
    void onOpslaan({ titel: kapitaliseer(titel.trim()), icoon });
    if (!initieel) {
      setTitel("");
      setIcoon("ListChecks");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      <Input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Bv. Plantjes water geven"
        required
      />
      <div className="flex flex-wrap gap-2">
        {Object.entries(KLUS_ICONEN).map(([naam, Icon]) => (
          <button
            key={naam}
            type="button"
            onClick={() => setIcoon(naam)}
            aria-label={naam}
            aria-pressed={icoon === naam}
            className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
              icoon === naam
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={bezig || !titel.trim()} className="flex-1">
          {bezig ? "Bezig…" : "Opslaan"}
        </Button>
        {onAnnuleren && (
          <Button type="button" variant="ghost" onClick={onAnnuleren} disabled={bezig}>
            Annuleren
          </Button>
        )}
      </div>
    </form>
  );
}
