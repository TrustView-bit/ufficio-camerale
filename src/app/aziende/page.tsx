import type { Metadata } from "next";

import { Briciole } from "@/components/elenco/briciole";
import { GrigliaCollegamenti } from "@/components/elenco/griglia-collegamenti";
import { IndiceAlfabetico } from "@/components/elenco/indice-alfabetico";
import { aggregaAziende } from "@/lib/companies";
import { regioni } from "@/lib/geo";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Aziende italiane per regione",
  description:
    "Sfoglia le aziende italiane partendo dalla regione, poi dalla provincia e dal comune.",
  robots: ROBOTS_SE_DIMOSTRATIVO,
};

export default async function AziendePage() {
  const [conteggi, perLettera] = await Promise.all([
    aggregaAziende({}, "regione"),
    aggregaAziende({}, "iniziale"),
  ]);
  const perRegione = new Map(conteggi.map((voce) => [voce.chiave, voce.quante]));

  const voci = regioni()
    .map((regione) => ({
      nome: regione.nome,
      href: `/aziende/${regione.slug}`,
      quante: perRegione.get(regione.nome) ?? 0,
    }))
    .filter((voce) => voce.quante > 0);

  const totale = voci.reduce((somma, voce) => somma + voce.quante, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Briciole voci={[]} />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Aziende italiane per regione
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        <span className="num text-foreground font-medium">{totale}</span> aziende
        con sede in {voci.length} regioni. Scendi di livello per arrivare alla
        provincia, al comune e infine alla singola scheda.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Indice alfabetico
          </h2>
          <IndiceAlfabetico
            conteggi={new Map(perLettera.map((v) => [v.chiave, v.quante]))}
          />
        </section>

        <GrigliaCollegamenti titolo="Regioni" voci={voci} />
      </div>
    </div>
  );
}
