// Auth + profiel-hook — zelfde patroon als Corsica26 (src/lib/auth.ts), aangepast
// naar het gezinsapp-schema (gezinnen/profiles met rol ouder/kind).
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

export type Rol = Enums<"app_rol">;

export type Profile = {
  id: string;
  gezin_id: string | null;
  naam: string;
  rol: Rol;
  avatar_initial: string | null;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let alive = true;
    setProfileLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, gezin_id, naam, rol, avatar_initial")
        .eq("id", userId)
        .maybeSingle();
      if (alive) {
        setProfile((data as Profile) ?? null);
        setProfileLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const refreshProfile = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, gezin_id, naam, rol, avatar_initial")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading: loading || (!!session && profileLoading),
    refreshProfile,
    signOut: () => supabase.auth.signOut(),
  } as {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    signOut: () => Promise<unknown>;
  };
}
