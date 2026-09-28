// Niveau 1 uit de UX-review: voor goedkoop te herstellen acties geen
// dialoogvenster, gewoon meteen uitvoeren en een korte melding met een
// "Ongedaan maken"-knop tonen (~5s). Te veel bevestigingen leiden ertoe
// dat mensen ze wegklikken zonder te lezen — dit patroon is daarvoor.
import { toast } from "sonner";

export function toastOngedaanMaken(bericht: string, herstel: () => void | Promise<void>) {
  toast(bericht, {
    action: {
      label: "Ongedaan maken",
      onClick: () => void herstel(),
    },
    duration: 5000,
  });
}
