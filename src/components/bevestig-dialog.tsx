import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

// Herbruikbare bevestigingsdialoog (Niveau 2 uit de UX-review) — de
// destructieve knop krijgt de destructieve kleur, annuleren is de
// standaardkeuze en krijgt de focus (AlertDialogCancel staat als eerste
// element), en Escape annuleert (gratis via Radix' AlertDialog).
export function BevestigDialog({
  open,
  onOpenChange,
  titel,
  beschrijving,
  bevestigLabel = "Verwijderen",
  destructief = true,
  bezig = false,
  onBevestig,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titel: string;
  beschrijving: ReactNode;
  bevestigLabel?: string;
  destructief?: boolean;
  bezig?: boolean;
  onBevestig: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titel}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{beschrijving}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={bezig}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            disabled={bezig}
            onClick={(e) => {
              e.preventDefault();
              void onBevestig();
            }}
            className={destructief ? buttonVariants({ variant: "destructive" }) : undefined}
          >
            {bezig ? "Bezig…" : bevestigLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
