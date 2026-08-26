import { useRef, useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PrikbordForm({
  bezig,
  onPlaatsen,
}: {
  bezig: boolean;
  onPlaatsen: (tekst: string, tags: string[], foto: File | null) => void | Promise<void>;
}) {
  const [tekst, setTekst] = useState("");
  const [tagsInvoer, setTagsInvoer] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const tags = tagsInvoer
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    void onPlaatsen(tekst.trim(), tags, foto);
    setTekst("");
    setTagsInvoer("");
    setFoto(null);
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-card"
    >
      <Textarea
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        placeholder="Wat wil je delen met het gezin?"
        rows={3}
      />
      <Input
        value={tagsInvoer}
        onChange={(e) => setTagsInvoer(e.target.value)}
        placeholder="Tags, met komma's gescheiden (optioneel)"
      />
      {foto && <p className="text-xs text-muted-foreground">📎 {foto.name}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => fotoInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" /> Foto
        </Button>
        <Button type="submit" disabled={bezig || !tekst.trim()} className="flex-1">
          {bezig ? "Bezig…" : "Plaatsen"}
        </Button>
      </div>
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
      />
    </form>
  );
}
