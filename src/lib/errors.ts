// Fouten uit Supabase/PostgREST zijn gewone objecten (geen Error), dus
// `String(err)` levert "[object Object]" op. Deze helper haalt overal een
// leesbare tekst uit, met een zinnige fallback.
export function foutTekst(err: unknown, fallback = "Er ging iets mis. Probeer het opnieuw."): string {
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; error_description?: unknown; details?: unknown; hint?: unknown };
    for (const veld of [o.message, o.error_description, o.details, o.hint]) {
      if (typeof veld === "string" && veld.trim()) return veld;
    }
  }
  return fallback;
}
