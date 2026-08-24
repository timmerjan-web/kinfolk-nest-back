import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gezinsapp — backend klaar" },
      {
        name: "description",
        content:
          "Backend van de gezinsapp: database met gezinnen, profielen en uitnodigingen, plus e-mail- en Google-login.",
      },
      { property: "og:title", content: "Gezinsapp — backend klaar" },
      {
        property: "og:description",
        content:
          "Backend van de gezinsapp: database met gezinnen, profielen en uitnodigingen, plus e-mail- en Google-login.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Gezinsapp
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          De backend staat klaar: gezinnen, profielen met rol (ouder/kind) en
          uitnodigingscodes, met e-mail- en Google-login. De frontend bouw je hier
          bovenop.
        </p>
      </div>
    </main>
  );
}
