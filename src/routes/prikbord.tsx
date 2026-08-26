import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Pin, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { PrikbordForm } from "@/components/prikbord-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foutTekst } from "@/lib/errors";
import {
  createPrikbordItem,
  deletePrikbordItem,
  listPrikbord,
  signedUrl,
  togglePin,
  updatePrikbordItem,
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
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [bewerkTekst, setBewerkTekst] = useState("");
  const [bewerkTags, setBewerkTags] = useState("");
  const [bewerkFotoVerwijderen, setBewerkFotoVerwijderen] = useState(false);
  const [bewerkBezig, setBewerkBezig] = useState(false);

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

  const startBewerken = (item: PrikbordItem) => {
    setBewerkId(item.id);
    setBewerkTekst(item.tekst);
    setBewerkTags(item.tags.join(", "));
    setBewerkFotoVerwijderen(false);
  };

  const annulerenBewerken = () => setBewerkId(null);

  const opslaanBewerking = async (item: PrikbordItem) => {
    const tekst = bewerkTekst.trim();
    if (!tekst) return;
    const tags = bewerkTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setBewerkBezig(true);
    try {
      await updatePrikbordItem(item, tekst, tags, bewerkFotoVerwijderen);
      setBewerkId(null);
      laad();
    } catch (err) {
      toast.error(foutTekst(err, "Opslaan mislukt."));
    } finally {
      setBewerkBezig(false);
    }
  };

  const delen = async (item: PrikbordItem) => {
    try {
      const url = item.storage_pad ? urls[item.id] : undefined;
      if (navigator.share) {
        if (url) {
          const blob = await (await fetch(url)).blob();
          const bestand = new File([blob], "prikbord.jpg", { type: blob.type || "image/jpeg" });
          if (navigator.canShare?.({ files: [bestand] })) {
            await navigator.share({ text: item.tekst, files: [bestand] });
            return;
          }
        }
        await navigator.share({ text: item.tekst });
      } else {
        await navigator.clipboard.writeText(item.tekst);
        toast.success("Tekst gekopieerd naar klembord.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(foutTekst(err, "Delen mislukt."));
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
              {bewerkId === item.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={bewerkTekst}
                    onChange={(e) => setBewerkTekst(e.target.value)}
                    rows={3}
                  />
                  <Input
                    value={bewerkTags}
                    onChange={(e) => setBewerkTags(e.target.value)}
                    placeholder="Tags, met komma's gescheiden (optioneel)"
                  />
                  {item.storage_pad && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={bewerkFotoVerwijderen}
                        onChange={(e) => setBewerkFotoVerwijderen(e.target.checked)}
                      />
                      Foto verwijderen
                    </label>
                  )}
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={annulerenBewerken} className="flex-1">
                      Annuleren
                    </Button>
                    <Button
                      onClick={() => void opslaanBewerking(item)}
                      disabled={bewerkBezig || !bewerkTekst.trim()}
                      className="flex-1"
                    >
                      {bewerkBezig ? "Bezig…" : "Opslaan"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <button
                      onClick={() => startBewerken(item)}
                      className="whitespace-pre-line text-left text-sm"
                    >
                      {item.tekst}
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startBewerken(item)}
                        aria-label="Bewerken"
                        className="text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void delen(item)}
                        aria-label="Delen"
                        className="text-muted-foreground"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
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
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
