import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChefHat, Clock, Plus, Search, Star, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionCard } from "@/components/app-shell";
import { RequireGezin } from "@/components/require-auth";
import { PlanReceptButton } from "@/components/plan-recept-button";
import { foutTekst } from "@/lib/errors";
import { categorieLabel, listRecepten, RECEPT_CATEGORIEEN, type Recept } from "@/lib/recepten";
import { useReceptFavorieten } from "@/lib/receptFavorieten";

export const Route = createFileRoute("/recepten/")({
  head: () => ({ meta: [{ title: "Recepten — Gezinsapp" }] }),
  component: () => (
    <RequireGezin>
      <ReceptenPage />
    </RequireGezin>
  ),
});

function ReceptenPage() {
  const [recepten, setRecepten] = useState<Recept[] | null>(null);
  const [tab, setTab] = useState<string>(RECEPT_CATEGORIEEN[1]);
  const [zoek, setZoek] = useState("");
  const [actieveTags, setActieveTags] = useState<Set<string>>(new Set());
  const [alleenFavorieten, setAlleenFavorieten] = useState(false);
  const { ids: favorieten, toggle: toggleFavoriet } = useReceptFavorieten();

  useEffect(() => {
    listRecepten()
      .then(setRecepten)
      .catch((err) => toast.error(foutTekst(err, "Recepten laden mislukt.")));
  }, []);

  const categorieen = useMemo(() => {
    const s = new Set<string>(RECEPT_CATEGORIEEN);
    (recepten ?? []).forEach((r) => s.add(r.categorie));
    return Array.from(s);
  }, [recepten]);

  const tabRecepten = useMemo(
    () => (recepten ?? []).filter((r) => r.categorie === tab),
    [recepten, tab],
  );

  const alleTags = useMemo(
    () => Array.from(new Set(tabRecepten.flatMap((r) => r.tags))).sort(),
    [tabRecepten],
  );

  useEffect(() => {
    setActieveTags(new Set());
  }, [tab]);

  const toggleTag = (tag: string) => {
    setActieveTags((huidig) => {
      const next = new Set(huidig);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    return tabRecepten.filter((r) => {
      if (alleenFavorieten && !favorieten.has(r.id)) return false;
      if (actieveTags.size > 0 && !Array.from(actieveTags).every((t) => r.tags.includes(t)))
        return false;
      if (!q) return true;
      if (r.titel.toLowerCase().includes(q)) return true;
      if (r.tags.some((t) => t.toLowerCase().includes(q))) return true;
      return r.ingredienten.some((i) => i.toLowerCase().includes(q));
    });
  }, [tabRecepten, zoek, actieveTags, alleenFavorieten, favorieten]);

  return (
    <AppShell
      title="Recepten"
      subtitle="Het gezinskookboek"
      action={
        <Link
          to="/recepten/nieuw"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          aria-label="Nieuw recept"
        >
          <Plus className="h-4 w-4" />
        </Link>
      }
    >
      <div
        className="mb-2 grid gap-2 rounded-2xl border border-border bg-card p-1"
        style={{ gridTemplateColumns: `repeat(${categorieen.length}, 1fr)` }}
      >
        {categorieen.map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`rounded-xl px-3 py-2 text-sm font-medium capitalize ${
              tab === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {categorieLabel(c)}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setAlleenFavorieten(false)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            !alleenFavorieten
              ? "bg-secondary text-secondary-foreground"
              : "border border-border bg-card text-muted-foreground"
          }`}
        >
          Alles
        </button>
        <button
          type="button"
          onClick={() => setAlleenFavorieten(true)}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
            alleenFavorieten
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground"
          }`}
        >
          <Star className="h-3 w-3" /> Favorieten
        </button>
      </div>

      <SectionCard className="mb-3">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op naam, tag of ingrediënt…"
            className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {alleTags.length > 0 && (
          <div className="-mx-1 mt-2 flex flex-wrap gap-1.5 px-1">
            {alleTags.map((tag) => {
              const actief = actieveTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    actief
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-foreground/70"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
            {actieveTags.size > 0 && (
              <button
                type="button"
                onClick={() => setActieveTags(new Set())}
                className="rounded-full px-2 py-1 text-[11px] text-muted-foreground underline"
              >
                wis filter
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {recepten === null ? (
        <SectionCard className="text-center text-sm text-muted-foreground">Laden…</SectionCard>
      ) : gefilterd.length === 0 ? (
        <SectionCard className="text-center">
          <ChefHat className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {tabRecepten.length === 0
              ? `Nog geen ${tab}-recepten. Voeg het eerste toe.`
              : "Geen recepten gevonden met dit filter."}
          </p>
          {tabRecepten.length === 0 && (
            <Link
              to="/recepten/nieuw"
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Recept toevoegen
            </Link>
          )}
        </SectionCard>
      ) : (
        <ul className="space-y-2">
          {gefilterd.map((recept) => {
            const isFavoriet = favorieten.has(recept.id);
            return (
              <li key={recept.id}>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
                  <Link
                    to="/recepten/$receptId"
                    params={{ receptId: recept.id }}
                    className="min-w-0 flex-1 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ChefHat className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm leading-tight">{recept.titel}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                          {recept.bereidingstijd_minuten != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {recept.bereidingstijd_minuten} min
                            </span>
                          )}
                          {recept.porties != null && (
                            <span className="flex items-center gap-1">
                              <UsersIcon className="h-3 w-3" /> {recept.porties} porties
                            </span>
                          )}
                        </div>
                        {recept.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {recept.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void toggleFavoriet(recept.id, recept.gezin_id)}
                      aria-label="Favoriet"
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        isFavoriet ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <Star className={`h-5 w-5 ${isFavoriet ? "fill-current" : ""}`} />
                    </button>
                    <PlanReceptButton receptId={recept.id} titel={recept.titel} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
