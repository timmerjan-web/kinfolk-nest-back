import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { PrikbordForm } from "@/components/prikbord-form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import {
  createPrikbordItem,
  deletePrikbordItem,
  listPrikbord,
  signedUrl,
  togglePin,
  type PrikbordItem,
} from "@/lib/prikbord";

export const Route = createFileRoute("/prikbord")({
  head: () => ({ meta: [{ title: "Prikbord — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <PrikbordPage />
    </RequireGezin>
  ),
});

function PrikbordPage() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<PrikbordItem[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [leden, setLeden] = useState<{ id: string; naam: string }[]>([]);
  const [actieveTag, setActieveTag] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const laad = () => {
    listPrikbord()
      .then(setItems)
      .catch((err) => toast.error(foutTekst(err, "Prikbord laden mislukt.")));
  };

  useEffect(() => {
    laad();
  }, []);

  useEffect(() => {
    if (!profile?.gezin_id) return;
    supabase
      .from("profiles")
      .select("id, naam")
      .eq("gezin_id", profile.gezin_id)
      .then(({ data }) => setLeden(data ?? []));
  }, [profile?.gezin_id]);

  useEffect(() => {
    const metFoto = (items ?? []).filter((i) => i.storage_pad);
    if (metFoto.length === 0) return;
    let actief = true;
    void (async () => {
      const paren = await Promise.all(
        metFoto.map(async (i) => [i.id, await signedUrl(i.storage_pad!)] as const),
      );
      if (!actief) return;
      const nieuw: Record<string, string> = {};
      for (const [id, url] of paren) if (url) nieuw[id] = url;
      setUrls(nieuw);
    })();
    return () => {
      actief = false;
    };
  }, [items]);

  const alleTags = useMemo(
    () => Array.from(new Set((items ?? []).flatMap((i) => i.tags))).sort(),
    [items],
  );
  const zichtbaar = actieveTag
    ? (items ?? []).filter((i) => i.tags.includes(actieveTag))
    : (items ?? []);

  const plaatsen = async (tekst: string, tags: string[], foto: File | null) => {
    if (!profile?.gezin_id || !user) return;
    setBezig(true);
    try {
      await createPrikbordItem(profile.gezin_id, user.id, tekst, tags, foto);
      toast.success("Geplaatst.");
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Plaatsen mislukt."));
    } finally {
      setBezig(false);
    }
  };

  const pin = async (item: PrikbordItem) => {
    try {
      await togglePin(item.id, !item.vastgepind);
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Vastpinnen mislukt."));
    }
  };

  const verwijderen = async (item: PrikbordItem) => {
    try {
      await deletePrikbordItem(item);
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Verwijderen mislukt."));
    }
  };

  return (
    <AppShell title="Prikbord" subtitle="Voor het hele gezin">
      <div className="mb-3">
        <PrikbordForm bezig={bezig} onPlaatsen={plaatsen} />
      </div>

      {alleTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActieveTag(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              actieveTag === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Alles
          </button>
          {alleTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActieveTag(tag)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                actieveTag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {items === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : zichtbaar.length === 0 ? (
        <SectionCard className="text-center text-sm text-muted-foreground">
          {actieveTag ? `Niets met #${actieveTag}.` : "Nog niets op het prikbord."}
        </SectionCard>
      ) : (
        <ul className="space-y-2">
          {zichtbaar.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border p-3 shadow-card ${
                item.vastgepind ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="whitespace-pre-line text-sm">{item.tekst}</p>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => void pin(item)}
                    aria-label={item.vastgepind ? "Losmaken" : "Vastpinnen"}
                    className={item.vastgepind ? "text-primary" : "text-muted-foreground"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void verwijderen(item)}
                    aria-label="Verwijderen"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {item.storage_pad && urls[item.id] && (
                <img
                  src={urls[item.id]}
                  alt=""
                  className="mb-2 max-h-64 w-full rounded-lg object-cover"
                />
              )}

              {item.tags.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                {leden.find((l) => l.id === item.created_by)?.naam ?? "Gezinslid"} ·{" "}
                {new Date(item.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
