import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  ChefHat,
  CalendarDays,
  ShoppingCart,
  ListChecks,
  CalendarClock,
  Users,
  LogOut,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { GezinsappLogo } from "./logo";
import { useAuth } from "@/lib/auth";

const primaryNav = [
  { to: "/", label: "Vandaag", icon: Home },
  { to: "/recepten", label: "Recepten", icon: ChefHat },
  { to: "/weekmenu", label: "Weekmenu", icon: CalendarDays },
  { to: "/boodschappen", label: "Boodschappen", icon: ShoppingCart },
  { to: "/klusjes", label: "Klusjes", icon: ListChecks },
  { to: "/agenda", label: "Agenda", icon: CalendarClock },
  { to: "/gezin", label: "Gezin", icon: Users },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const initial = profile?.avatar_initial ?? profile?.naam?.[0]?.toUpperCase() ?? "·";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="safe-top surface-dark">
        <div className="mx-auto max-w-2xl px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <Link to="/" className="flex items-center gap-3 text-white">
              <GezinsappLogo className="h-10 w-10 shrink-0 text-white" />
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

      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>

      <nav className="surface-dark fixed inset-x-0 bottom-0 z-40 safe-bottom border-t border-white/10 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1">
          {primaryNav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors ${
                    active ? "text-primary" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                  <span>{label}</span>
                </Link>
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
