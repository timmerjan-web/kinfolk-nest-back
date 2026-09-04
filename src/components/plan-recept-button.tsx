import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import { addDays, createDag, getDag, startOfWeek, toDatumString, updateDag } from "@/lib/weekmenu";

const DAGNAMEN = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

// Corsica plant op (datum, dagdeel) met meerdere items per dag in daily_plan.
// Ons weekmenu heeft maar één maaltijd per dag (createDag/updateDag), dus
// hier is enkel een dag-keuze nodig, en overschrijven vraagt bevestiging
// i.p.v. gewoon een tweede rij toe te voegen.
export function PlanReceptButton({ receptId, titel }: { receptId: string; titel: string }) {
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState<string | null>(null);

  const start = startOfWeek(new Date());
  const dagen = Array.from({ length: 14 }, (_, i) => addDays(start, i));

  const kies = async (datum: Date) => {
    if (!profile?.gezin_id || !user) return;
    const iso = toDatumString(datum);
    setBezig(iso);
    try {
      const bestaand = await getDag(iso);
      if (bestaand) {
        const bevestigd = window.confirm(
          `${DAGNAMEN[datum.getDay()]} ${datum.getDate()} staat al "${bestaand.titel}" gepland. Vervangen door "${titel}"?`,
        );
        if (!bevestigd) return;
        await updateDag(bestaand.id, {
          titel,
          recept_id: receptId,
          kok: bestaand.kok,
          notitie: bestaand.notitie,
        });
      } else {
        await createDag(profile.gezin_id, user.id, iso, {
          titel,
          recept_id: receptId,
          kok: null,
          notitie: null,
        });
      }
      toast.success(`"${titel}" ingepland.`);
      setOpen(false);
    } catch (err) {
      toast.error(foutTekst(err, "Inplannen mislukt."));
    } finally {
      setBezig(null);
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-label="Inplannen in weekmenu"
        className="flex h-9 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold text-foreground/80"
      >
        <CalendarPlus className="h-3.5 w-3.5" /> Plan
      </button>
      {open && (
        <div
          className="surface-light absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-elevated"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kies dag
          </p>
          <div className="flex flex-wrap gap-1">
            {dagen.map((d) => {
              const iso = toDatumString(d);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={bezig !== null}
                  onClick={() => void kies(d)}
                  className="flex w-[13%] shrink-0 flex-col items-center rounded-lg border border-border px-1 py-1 text-[10px] font-semibold text-foreground/70 hover:bg-muted disabled:opacity-50"
                >
                  <span className="uppercase tracking-wide opacity-70">{DAGNAMEN[d.getDay()]}</span>
                  <span className="text-xs leading-none text-foreground">
                    {bezig === iso ? <Loader2 className="h-3 w-3 animate-spin" /> : d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
