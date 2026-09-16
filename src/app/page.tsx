import type { Metadata } from "next";
import { Building2, ScanSearch, ShieldCheck } from "lucide-react";

import { AziendeInEvidenza } from "@/components/home/aziende-in-evidenza";
import { SearchForm } from "@/components/search/search-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { aziendeInEvidenza } from "@/lib/companies";
import { env } from "@/lib/env";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Chi pubblica il sito e come si chiama: è da qui che Google prende il nome
// del sito da mostrare nei risultati e l'editore da associare alle schede.
const SITO_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${env.NEXT_PUBLIC_SITE_URL}/#organization`,
      name: "Catalogo Imprese",
      url: env.NEXT_PUBLIC_SITE_URL,
      logo: `${env.NEXT_PUBLIC_SITE_URL}/sigillo.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${env.NEXT_PUBLIC_SITE_URL}/#website`,
      name: "Catalogo Imprese",
      url: env.NEXT_PUBLIC_SITE_URL,
      inLanguage: "it",
      publisher: { "@id": `${env.NEXT_PUBLIC_SITE_URL}/#organization` },
    },
  ],
};

const PASSI = [
  {
    icon: ScanSearch,
    title: "Riconoscimento automatico",
    description:
      "Non devi scegliere il tipo di ricerca: capiamo da solo se hai scritto una Partita IVA, un codice fiscale o una ragione sociale.",
  },
  {
    icon: ShieldCheck,
    title: "Controllo immediato",
    description:
      "La cifra di controllo della Partita IVA è verificata mentre digiti, nel tuo browser, prima di interrogare qualsiasi servizio esterno.",
  },
  {
    icon: Building2,
    title: "Scheda camerale",
    description:
      "Anagrafica, sede, codici ATECO, numero REA e contatti raccolti in una pagina sola, leggibile anche da telefono.",
  },
] as const;

export default async function Home() {
  const evidenza = await aziendeInEvidenza(6);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(SITO_JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <section className="py-16 sm:py-24">
        <Badge
          variant="outline"
          className="border-accent/30 bg-accent/10 text-accent mb-6 h-7 gap-1.5 px-3"
        >
          <ShieldCheck className="size-3" aria-hidden />
          Dati pubblici del Registro Imprese e VIES
        </Badge>

        <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Verifica una Partita IVA,
          <br className="hidden sm:block" /> consulta l&apos;azienda dietro il
          numero.
        </h1>

        <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-relaxed">
          Inserisci una Partita IVA, un codice fiscale o una ragione sociale.
          Riconosciamo automaticamente cosa hai digitato e ti mostriamo la scheda
          camerale completa.
        </p>

        <div className="mt-9 max-w-2xl">
          <SearchForm />
        </div>
      </section>

      <AziendeInEvidenza aziende={evidenza} />

      <section className="pb-8" aria-labelledby="come-funziona">
        <h2
          id="come-funziona"
          className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
        >
          Come funziona
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PASSI.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="shadow-card">
              <CardHeader>
                <h3
                  data-slot="card-title"
                  className="font-heading flex items-center gap-2 text-base leading-snug font-medium"
                >
                  <Icon className="text-primary size-4" aria-hidden />
                  {title}
                </h3>
                <CardDescription className="leading-relaxed">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
