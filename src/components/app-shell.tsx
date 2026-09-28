import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, ChevronLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { GezinsappLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/lib/auth";
import { telKlusjesVandaagVoor } from "@/lib/klusjes";
import { haalScroll, laatstePad, onthoudLaatstePad, onthoudScroll } from "@/lib/navMemory";
import { NAV_SECTIES, sectieVoorPad, type NavSectie } from "@/lib/navSecties";

export function AppShell({
  title,
  subtitle,
  children,
  action,
  terug,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  action?: ReactNode;
  // Route om naartoe te gaan met een terugpijl i.p.v. het logo — voor
  // detailschermen die vanuit een lijst geopend worden. Zonder browserbalk
  // (geïnstalleerde PWA) is dit de enige weg terug. Onderdrukt ook de
  // sub-navbalk: een detailscherm herhaalt de sectietabs niet, het heeft
  // al een expliciete terugpijl.
  terug?: string;
}) {
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [klusjesVandaag, setKlusjesVandaag] = useState(0);

  const actieveSectie = sectieVoorPad(pathname);

  // Scrollpositie per pad onthouden (bij het verlaten van deze pagina) en
  // herstellen (bij het opnieuw bezoeken) — en het laatst bezochte pad
  // binnen de huidige sectie bijhouden voor "laatste tabblad onthouden".
  useEffect(() => {
    const y = haalScroll(pathname);
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    if (actieveSectie) onthoudLaatstePad(actieveSectie.key, pathname);
    return () => {
      onthoudScroll(pathname, window.scrollY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    telKlusjesVandaagVoor(user.id)
      .then(setKlusjesVandaag)
      .catch(() => setKlusjesVandaag(0));
  }, [user, pathname]);

  if (!user) return null;

  const initial = profile?.avatar_initial ?? profile?.naam?.[0]?.toUpperCase() ?? "·";

  // NAV_SECTIES komt uit een data-array (niet uit TanStack's statisch
  // gegenereerde routeboom), dus de paden zijn hier bewust `string` i.p.v.
  // een letterlijke route-unie. De cast is alleen nodig op de twee
  // plekken waar zo'n pad echt aan de router doorgegeven wordt.
  const klikSectie = (sectie: NavSectie) => {
    if (sectie.key === actieveSectie?.key) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const doel = laatstePad(sectie.key) ?? sectie.standaardPad;
    void navigate({ to: doel as never });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="safe-top surface-dark">
        <div className="mx-auto max-w-2xl px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <Link to={(terug ?? "/") as never} className="flex items-center gap-3 text-white">
              {terug ? (
                <ChevronLeft className="h-8 w-8 shrink-0" aria-label="Terug" />
              ) : (
                <GezinsappLogo className="h-10 w-10 shrink-0 text-white" />
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">
                  Gezinsapp
                </p>
                <h1 className="font-display text-2xl leading-none">{title}</h1>
                {subtitle && <p className="mt-1 text-xs opacity-80">{subtitle}</p>}
              </div>
            </Link>
            <div className="flex items-center gap-2">
              {action}
              <NotificationBell />
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white backdrop-blur"
                  aria-label="Gebruikersmenu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {initial}
                  </span>
                  <span className="hidden max-w-[80px] truncate sm:inline">{profile?.naam}</span>
                </button>
                {menuOpen && (
                  <div
                    className="surface-light absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border bg-card p-2 text-sm text-card-foreground shadow-elevated"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <p className="px-2 py-1 text-xs text-muted-foreground">Ingelogd als</p>
                    <p className="truncate px-2 pb-2 font-medium">{profile?.naam ?? user.email}</p>
                    <button
                      onClick={async () => {
                        await signOut();
                        navigate({ to: "/auth", replace: true });
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-destructive hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" /> Uitloggen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {!terug && actieveSectie?.subNav && (
        <div className="border-b border-border bg-background px-4 py-2">
          <div className="mx-auto flex max-w-2xl gap-2">
            {actieveSectie.subNav.map((item) => {
              const actief = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as never}
                  className={`flex min-h-12 items-center rounded-full px-4 text-xs font-semibold transition-colors ${
                    actief
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>

      <nav className="surface-dark fixed inset-x-0 bottom-0 z-40 safe-bottom border-t border-white/10 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between gap-1 px-2">
          {NAV_SECTIES.map((sectie) => {
            const actief = sectie.key === actieveSectie?.key;
            const Icon = sectie.icon;
            return (
              <li key={sectie.key} className="flex-1">
                <button
                  onClick={() => klikSectie(sectie)}
                  className={`relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors ${
                    actief ? "text-primary" : "text-white/70 hover:text-white"
                  }`}
                >
                  <span className="relative">
                    <Icon className={`h-5 w-5 ${actief ? "scale-110" : ""} transition-transform`} />
                    {sectie.key === "planning" && klusjesVandaag > 0 && (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                        {klusjesVandaag > 9 ? "9+" : klusjesVandaag}
                      </span>
                    )}
                  </span>
                  <span>{sectie.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-card ${className}`}>
      {children}
    </div>
  );
}
