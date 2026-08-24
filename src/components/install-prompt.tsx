import { useEffect, useState } from "react";
import { Download, X, Share2 } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed-v1";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }
    setDismissed(false);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari()) {
      t = setTimeout(() => setShowIos(true), 1500);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    dismiss();
  };

  if (dismissed || (!evt && !showIos)) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-elevated">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {showIos ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Zet Gezinsapp op je startscherm</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showIos
              ? 'Tik op Deel (□↑) en dan op "Zet op beginscherm".'
              : "Werkt sneller en offline, net als een gewone app."}
          </p>
          {!showIos && (
            <button
              onClick={install}
              className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Installeren
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Sluiten" className="shrink-0 text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
