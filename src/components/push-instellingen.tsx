import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { foutTekst } from "@/lib/errors";
import {
  huidigPushAbonnement,
  pushMogelijkInDezeContext,
  pushOndersteund,
  schakelPushIn,
  schakelPushUit,
} from "@/lib/push";

export function PushInstellingen() {
  const { profile, user } = useAuth();
  const [ondersteund, setOndersteund] = useState(false);
  const [mogelijk, setMogelijk] = useState(false);
  const [ingeschakeld, setIngeschakeld] = useState(false);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    if (!pushOndersteund()) return;
    setOndersteund(true);
    const kan = pushMogelijkInDezeContext();
    setMogelijk(kan);
    if (!kan) return;
    huidigPushAbonnement()
      .then((abonnement) => setIngeschakeld(!!abonnement))
      .catch(() => setIngeschakeld(false));
  }, []);

  if (!ondersteund) return null;

  const aanzetten = async () => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      await schakelPushIn(profile.gezin_id, user.id);
      setIngeschakeld(true);
      toast.success("Pushmeldingen aangezet op dit toestel.");
    } catch (err) {
      toast.error(foutTekst(err, "Pushmeldingen aanzetten mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const uitzetten = async () => {
    setBezig(true);
    try {
      await schakelPushUit();
      setIngeschakeld(false);
      toast.success("Pushmeldingen uitgezet op dit toestel.");
    } catch (err) {
      toast.error(foutTekst(err, "Uitzetten mislukt."));
    } finally {
      setBezig(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">Pushmeldingen</p>
        <p className="text-xs text-muted-foreground">
          {mogelijk
            ? "Krijg een melding op dit toestel als je een klusje toegewezen krijgt."
            : "Meldingen werken alleen in de gepubliceerde app, geopend in een eigen browsertabblad (niet in de preview)."}
        </p>
      </div>
      <Button
        size="sm"
        variant={ingeschakeld ? "secondary" : "default"}
        disabled={bezig || !mogelijk}
        onClick={() => void (ingeschakeld ? uitzetten() : aanzetten())}
      >
        {bezig ? "Bezig…" : ingeschakeld ? "Uit" : "Aan"}
      </Button>
    </div>
  );
}
