import type { Metadata } from "next";

import { Briciole } from "@/components/elenco/briciole";
import { GrigliaCollegamenti } from "@/components/elenco/griglia-collegamenti";
import { divisioni, slugAteco } from "@/lib/ateco";
import { aggregaAziende } from "@/lib/companies";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Aziende italiane per settore",
  description:
    "Sfoglia le aziende italiane per settore di attività, secondo la classificazione ATECO 2025.",
  robots: ROBOTS_SE_DIMOSTRATIVO,
  alternates: { canonical: "/attivita" },
};

export default async function AttivitaPage() {
  const conteggi = await aggregaAziende({}, "ateco");
  const perCodice = new Map(conteggi.map((voce) => [voce.chiave, voce.quante]));

  const voci = divisioni()
    .map((divisione) => ({
      nome: `${divisione.codice} — ${divisione.titolo}`,
      href: `/attivita/${slugAteco(divisione.codice, divisione.titolo)}`,
      quante: perCodice.get(divisione.codice) ?? 0,
    }))
    .filter((voce) => voce.quante > 0);

  const totale = voci.reduce((somma, voce) => somma + voce.quante, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Briciole voci={[{ nome: "Settori" }]} />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Aziende italiane per settore
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        <span className="num text-foreground font-medium">{totale}</span> aziende
        classificate in {voci.length}{" "}
        {voci.length === 1 ? "divisione" : "divisioni"} ATECO. La classificazione in
        vigore è la <strong>ATECO 2025</strong>: i codici espressi nella precedente
        vengono tradotti.
      </p>

      <div className="mt-8">
        <GrigliaCollegamenti titolo="Divisioni" voci={voci} />
      </div>
    </div>
  );
}
