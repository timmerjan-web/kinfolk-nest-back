import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import {
  listMeldingen,
  markeerAllesGelezen,
  markeerGelezen,
  meldingTekst,
  type Melding,
} from "@/lib/meldingen";

export function NotificationBell() {
  const { user } = useAuth();
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [open, setOpen] = useState(false);

  const laad = () => {
    listMeldingen()
      .then(setMeldingen)
      .catch((err) => toast.error(foutTekst(err, "Meldingen laden mislukt.")));
  };

  useEffect(() => {
    if (!user) return;
    laad();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`meldingen-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meldingen",
          filter: `profiel_id=eq.${user.id}`,
        },
        () => laad(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const ongelezen = meldingen.filter((m) => !m.gelezen);

  const klik = async (melding: Melding) => {
    setOpen(false);
    if (melding.gelezen) return;
    try {
      await markeerGelezen(melding.id);
      setMeldingen((huidig) =>
        huidig.map((m) => (m.id === melding.id ? { ...m, gelezen: true } : m)),
      );
    } catch (err) {
      toast.error(foutTekst(err, "Bijwerken mislukt."));
    }
  };

  const allesGelezen = async () => {
    try {
      await markeerAllesGelezen(ongelezen.map((m) => m.id));
      setMeldingen((huidig) => huidig.map((m) => ({ ...m, gelezen: true })));
    } catch (err) {
      toast.error(foutTekst(err, "Bijwerken mislukt."));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Meldingen"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
      >
        <Bell className="h-4 w-4" />
        {ongelezen.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {ongelezen.length > 9 ? "9+" : ongelezen.length}
          </span>
        )}
      </button>
      {open && (
        <div
          className="surface-light absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-2 text-sm text-card-foreground shadow-elevated"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Meldingen
            </p>
            {ongelezen.length > 0 && (
              <button
                onClick={() => void allesGelezen()}
                className="text-xs text-muted-foreground underline"
              >
                Alles gelezen
              </button>
            )}
          </div>
          {meldingen.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">Nog geen meldingen.</p>
          ) : (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto">
              {meldingen.map((melding) => (
                <li key={melding.id}>
                  <Link
                    to="/klusjes"
                    onClick={() => void klik(melding)}
                    className={`block rounded-lg px-2 py-1.5 hover:bg-muted ${
                      melding.gelezen ? "text-muted-foreground" : "font-medium"
                    }`}
                  >
                    <p className="text-xs">{meldingTekst(melding)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(melding.created_at).toLocaleString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
