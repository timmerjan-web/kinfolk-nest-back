import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pin as PinIcon } from "lucide-react";
import { SectionCard } from "@/components/app-shell";
import { listPrikbord, type PrikbordItem } from "@/lib/prikbord";

export function PrikbordPreview() {
  const [items, setItems] = useState<PrikbordItem[] | null>(null);

  useEffect(() => {
    listPrikbord()
      .then((data) => setItems(data.slice(0, 3)))
      .catch(() => setItems([]));
  }, []);

  return (
    <SectionCard className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Prikbord
        </div>
        <Link to="/prikbord" className="text-xs text-muted-foreground underline">
          Bekijk alles
        </Link>
      </div>
      {items === null ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog niets geplaatst.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-1.5 text-sm">
              {item.vastgepind && <PinIcon className="mt-0.5 h-3 w-3 shrink-0 text-primary" />}
              <span className="line-clamp-1">{item.tekst}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
