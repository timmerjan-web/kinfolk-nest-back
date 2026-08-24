import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { GezinsappLogo } from "./logo";

function LoadingScreen() {
  return (
    <div className="surface-dark flex min-h-screen items-center justify-center">
      <GezinsappLogo className="h-16 w-16 animate-pulse text-white" />
    </div>
  );
}

/** Vereist een ingelogde gebruiker; gaat verder ongeacht of er al een gezin is. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Vereist een ingelogde gebruiker mét gezin — stuurt anders naar onboarding. */
export function RequireGezin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.gezin_id) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
