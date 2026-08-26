import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, Flame } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import { toDatumString } from "@/lib/weekmenu";
import {
  berekenStreak,
  listEigenFotos,
  listFotosVoorDatum,
  signedUrl,
  uploadFotoVanVandaag,
  type DagelijkseFoto,
} from "@/lib/dagelijksefoto";

export function FotoVanDeDag() {
  const { profile, user } = useAuth();
  const vandaag = toDatumString(new Date());
  const [gezinFotos, setGezinFotos] = useState<DagelijkseFoto[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState(0);
  const [leden, setLeden] = useState<{ id: string; naam: string }[]>([]);
  const [bezig, setBezig] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const laad = async () => {
    if (!user || !profile?.gezin_id) return;
    const [fotosVandaag, eigenFotos, ledenResult] = await Promise.all([
      listFotosVoorDatum(vandaag),
      listEigenFotos(user.id),
      supabase.from("profiles").select("id, naam").eq("gezin_id", profile.gezin_id),
    ]);
    setGezinFotos(fotosVandaag);
    setStreak(berekenStreak(eigenFotos.map((f) => f.datum)));
    setLeden(ledenResult.data ?? []);
  };

  useEffect(() => {
    void laad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.gezin_id]);

  useEffect(() => {
    if (!gezinFotos) return;
    let actief = true;
    void (async () => {
      const paren = await Promise.all(
        gezinFotos.map(async (f) => [f.id, await signedUrl(f.storage_pad)] as const),
      );
      if (!actief) return;
      const nieuw: Record<string, string> = {};
      for (const [id, url] of paren) if (url) nieuw[id] = url;
      setUrls(nieuw);
    })();
    return () => {
      actief = false;
    };
  }, [gezinFotos]);

  const eigenFoto = gezinFotos?.find((f) => f.gebruiker_id === user?.id) ?? null;
  const anderenVandaag = (gezinFotos ?? []).filter((f) => f.gebruiker_id !== user?.id);

  const kiesFoto = () => inputRef.current?.click();

  const uploaden = async (e: ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0];
    e.target.value = "";
    if (!bestand || !user || !profile?.gezin_id) return;
    setBezig(true);
    try {
      await uploadFotoVanVandaag(profile.gezin_id, user.id, vandaag, bestand);
      toast.success(eigenFoto ? "Foto vervangen." : "Foto van vandaag geplaatst!");
      await laad();
    } catch (err) {
      toast.error(foutTekst(err, "Foto plaatsen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  return (
    <SectionCard className="mb-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Camera className="h-4 w-4" /> Foto van de dag
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
            <Flame className="h-3.5 w-3.5" /> {streak} {streak === 1 ? "dag" : "dagen"} op rij
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => void uploaden(e)}
      />

      {gezinFotos === null ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : !eigenFoto ? (
        <button
          onClick={kiesFoto}
          disabled={bezig}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground disabled:opacity-60"
        >
          <Camera className="h-5 w-5" />
          {bezig ? "Bezig…" : "Maak de foto van vandaag"}
        </button>
      ) : (
        <div>
          <div className="mb-2 flex gap-2 overflow-x-auto">
            {urls[eigenFoto.id] && (
              <img
                src={urls[eigenFoto.id]}
                alt="Jouw foto van vandaag"
                className="h-24 w-24 shrink-0 rounded-lg object-cover"
              />
            )}
            {anderenVandaag.map((f) => {
              const naam = leden.find((l) => l.id === f.gebruiker_id)?.naam;
              return urls[f.id] ? (
                <div key={f.id} className="shrink-0 text-center">
                  <img
                    src={urls[f.id]}
                    alt={naam ?? "Gezinslid"}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  {naam && <p className="mt-1 text-[10px] text-muted-foreground">{naam}</p>}
                </div>
              ) : null;
            })}
          </div>
          {anderenVandaag.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nog niemand anders heeft vandaag geplaatst — kom straks terug.
            </p>
          )}
          <div className="mt-1 flex gap-3">
            <button onClick={kiesFoto} className="text-xs text-muted-foreground underline">
              Vervang je foto
            </button>
            <Link to="/fotos" className="text-xs text-muted-foreground underline">
              Bekijk je foto's
            </Link>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
