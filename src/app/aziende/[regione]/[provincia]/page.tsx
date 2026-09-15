import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Briciole } from "@/components/elenco/briciole";
import { GrigliaCollegamenti } from "@/components/elenco/griglia-collegamenti";
import { SchedaAzienda } from "@/components/elenco/scheda-azienda";
import { aggregaAziende, elencoAziende } from "@/lib/companies";
import {
  regioneDaSlug,
  siglaDaSlugProvincia,
  siglaToProvincia,
  slugTerritorio,
} from "@/lib/geo";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";

export const revalidate = 3600;

/** Quante aziende mostrare in anteprima sotto l'elenco dei comuni. */
const ANTEPRIMA = 24;

type Props = { params: Promise<{ regione: string; provincia: string }> };

async function risolvi(params: Props["params"]) {
  const { regione: slugRegione, provincia: slugProvincia } = await params;

  const regione = regioneDaSlug(slugRegione);
  const sigla = siglaDaSlugProvincia(slugProvincia);
  if (!regione || !sigla) return null;

  return {
    regione,
    slugRegione,
    slugProvincia,
    sigla,
    provincia: siglaToProvincia(sigla) ?? sigla,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const risolto = await risolvi(params);
  if (!risolto) return { title: "Provincia non trovata", robots: { index: false } };

  const { regione: slugRegione, provincia: slugProvincia } = await params;

  return {
    title: `Aziende in provincia di ${risolto.provincia}`,
    description: `Elenco delle aziende con sede in provincia di ${risolto.provincia}, comune per comune.`,
    alternates: { canonical: `/aziende/${slugRegione}/${slugProvincia}` },
    robots: ROBOTS_SE_DIMOSTRATIVO,
  };
}

export default async function ProvinciaPage({ params }: Props) {
  const risolto = await risolvi(params);
  if (!risolto) notFound();

  const filtri = { provincia: risolto.sigla };
  const [comuni, elenco] = await Promise.all([
    aggregaAziende(filtri, "comune"),
    elencoAziende(filtri, { limite: ANTEPRIMA }),
  ]);

  if (!elenco || elenco.totale === 0) notFound();

  const voci = comuni.map((voce) => ({
    nome: voce.chiave,
    href: `/aziende/${risolto.slugRegione}/${risolto.slugProvincia}/${slugTerritorio(voce.chiave)}`,
    quante: voce.quante,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Briciole
        voci={[
          { nome: risolto.regione, href: `/aziende/${risolto.slugRegione}` },
          { nome: risolto.provincia },
        ]}
      />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Aziende in provincia di {risolto.provincia}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        <span className="num text-foreground font-medium">{elenco.totale}</span>{" "}
        {elenco.totale === 1 ? "azienda" : "aziende"} con sede in provincia di{" "}
        {risolto.provincia}, in {voci.length}{" "}
        {voci.length === 1 ? "comune" : "comuni"}.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        <GrigliaCollegamenti titolo="Comuni" voci={voci} />

        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Alcune aziende della provincia
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {elenco.risultati.map((azienda) => (
              <li key={azienda.partitaIva}>
                <SchedaAzienda azienda={azienda} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
