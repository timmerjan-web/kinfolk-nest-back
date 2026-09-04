// Privé favorieten per gezinslid — RLS laat iedereen alleen zijn eigen
// rijen zien (gebruiker_id = auth.uid()), dus dit is bewust geen gedeelde
// gezin-brede lijst zoals de meeste andere tabellen.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useReceptFavorieten() {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  const laad = useCallback(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    supabase
      .from("recept_favorieten")
      .select("recept_id")
      .eq("gebruiker_id", user.id)
      .then(({ data }) => setIds(new Set((data ?? []).map((r) => r.recept_id))));
  }, [user]);

  useEffect(() => {
    laad();
  }, [laad]);

  const toggle = useCallback(
    async (receptId: string, gezinId: string) => {
      if (!user) return;
      const isFavoriet = ids.has(receptId);
      setIds((huidig) => {
        const next = new Set(huidig);
        if (isFavoriet) next.delete(receptId);
        else next.add(receptId);
        return next;
      });
      if (isFavoriet) {
        await supabase
          .from("recept_favorieten")
          .delete()
          .eq("gebruiker_id", user.id)
          .eq("recept_id", receptId);
      } else {
        await supabase
          .from("recept_favorieten")
          .insert({ gebruiker_id: user.id, recept_id: receptId, gezin_id: gezinId });
      }
    },
    [ids, user],
  );

  return { ids, toggle };
}
