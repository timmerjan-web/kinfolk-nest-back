// Eén gedeelde auth-store voor de hele app. Vroeger hield elke `useAuth()`
// zijn eigen sessie- en profielstate bij; dan startte elke component opnieuw
// in "loading" (flikkerende laadschermen) en werd het profiel telkens opnieuw
// opgehaald. Nu is er één store met één abonnement en één fetch.
import { useCallback, useEffect, useSyncExternalStore } from "react";
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

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const SERVER_STATE: AuthState = { session: null, user: null, profile: null, loading: true };

let state: AuthState = SERVER_STATE;
const listeners = new Set<() => void>();

function setState(patch: Partial<AuthState>) {
  const next = { ...state, ...patch };
  if (
    next.session === state.session &&
    next.user === state.user &&
    next.profile === state.profile &&
    next.loading === state.loading
  ) {
    return;
  }
  state = next;
  listeners.forEach((l) => l());
}

async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, gezin_id, naam, rol, avatar_initial")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

let initialized = false;
let currentUserId: string | null = null;

function applySession(session: Session | null) {
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  if (userId === currentUserId) {
    // Tokenvernieuwing — of Supabase's eigen dubbele initialisatie:
    // onAuthStateChange en getSession() vuren allebei voor dezelfde
    // sessie. loading hier NIET aanraken: als er nog een profielfetch
    // bezig is voor deze gebruiker (de eerste call zette loading=true),
    // moet die gewoon zelf klaar zijn voordat loading weer false wordt.
    // Anders ziet RequireGezin loading=false met profile nog steeds
    // null, en stuurt het voortijdig naar onboarding — race condition
    // die op een koude start (geïnstalleerde PWA, gedeelde link) een
    // bestaand gezinslid ten onrechte een "gezin aanmaken"-scherm toont.
    setState({ session, user });
    return;
  }

  currentUserId = userId;
  if (!userId) {
    setState({ session: null, user: null, profile: null, loading: false });
    return;
  }

  setState({ session, user, loading: true });
  void fetchProfile(userId).then((profile) => {
    if (currentUserId !== userId) return;
    setState({ profile, loading: false });
  });
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  supabase.auth.onAuthStateChange((_e, s) => applySession(s));
  void supabase.auth.getSession().then(({ data }) => applySession(data.session));
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshProfile() {
  if (!currentUserId) return;
  const profile = await fetchProfile(currentUserId);
  setState({ profile });
}

export function useAuth() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );

  // Zorgt dat de store ook start als er (nog) geen abonnee actief was.
  useEffect(() => {
    init();
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return {
    session: snapshot.session,
    user: snapshot.user,
    profile: snapshot.profile,
    loading: snapshot.loading,
    refreshProfile,
    signOut,
  };
}
