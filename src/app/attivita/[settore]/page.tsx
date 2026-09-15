import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Briciole } from "@/components/elenco/briciole";
import { GrigliaCollegamenti } from "@/components/elenco/griglia-collegamenti";
import { SchedaAzienda } from "@/components/elenco/scheda-azienda";
import { codiceDaSlugAteco, descriviAteco, titoloBreveAteco } from "@/lib/ateco";
import { aggregaAziende, elencoAziende } from "@/lib/companies";
import { siglaToProvincia, slugTerritorio, regioneDiSigla } from "@/lib/geo";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";
import { metaElenco } from "@/lib/seo-elenco";

export const revalidate = 3600;

const PER_PAGINA = 30;

type Props = {
  params: Promise<{ settore: string }>;
  searchParams: Promise<{ pagina?: string }>;
};

async function risolvi(params: Props["params"]) {
  const { settore } = await params;

  const codice = codiceDaSlugAteco(settore);
  if (!codice) return null;

  const descritto = descriviAteco(codice);
  if (!descritto) return null;

  return { codice, descrizione: descritto.descrizione, slug: settore };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const risolto = await risolvi(params);
  if (!risolto) return { title: "Settore non trovato", robots: { index: false } };

  const { pagina } = await searchParams;
  return {
    // «codice ateco NN» è la query: il codice apre il titolo, il nome Istat
    // (fino a 120 caratteri) è accorciato a quello che Google mostra
    ...metaElenco(
      `Codice ATECO ${risolto.codice} – ${titoloBreveAteco(risolto.descrizione)}`,
      `/attivita/${risolto.slug}`,
      Number(pagina) || 1,
    ),
    description: `Elenco delle aziende italiane con codice ATECO ${risolto.codice}: ${risolto.descrizione}.`,
    robots: ROBOTS_SE_DIMOSTRATIVO,
  };
}

export default async function SettorePage({ params, searchParams }: Props) {
  const risolto = await risolvi(params);
  if (!risolto) notFound();

  const { pagina: grezza } = await searchParams;
  const pagina = Math.max(1, Number(grezza) || 1);

  const filtri = { ateco: risolto.codice };
  const [elenco, province] = await Promise.all([
    elencoAziende(filtri, {
      offset: (pagina - 1) * PER_PAGINA,
      limite: PER_PAGINA,
    }),
    aggregaAziende(filtri, "provincia"),
  ]);

  if (!elenco || elenco.totale === 0) notFound();

  const pagine = Math.max(1, Math.ceil(elenco.totale / PER_PAGINA));

  // i collegamenti incrociati fra settore e territorio: è ciò che rende
  // l'archivio percorribile in due direzioni invece che in una
  const territori = province
    .map((voce) => {
      const regione = regioneDiSigla(voce.chiave);
      if (!regione) return null;

      return {
        nome: siglaToProvincia(voce.chiave) ?? voce.chiave,
        href: `/aziende/${slugTerritorio(regione)}/${slugTerritorio(
          siglaToProvincia(voce.chiave) ?? voce.chiave,
        )}`,
        quante: voce.quante,
      };
    })
    .filter((voce) => voce !== null)
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Briciole
        voci={[
          { nome: "Settori", href: "/attivita" },
          { nome: `${risolto.codice} — ${risolto.descrizione}` },
        ]}
      />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance">
        {risolto.descrizione}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        <span className="num text-foreground font-medium">{elenco.totale}</span>{" "}
        {elenco.totale === 1 ? "azienda" : "aziende"} con codice ATECO{" "}
        <span className="num text-foreground font-medium">{risolto.codice}</span>.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {elenco.risultati.map((azienda) => (
            <li key={azienda.partitaIva}>
              <SchedaAzienda azienda={azienda} />
            </li>
          ))}
        </ul>

        {pagine > 1 && (
          <nav
            aria-label="Pagine dei risultati"
            className="flex items-center gap-2"
          >
            {pagina > 1 && (
              <a
                href={
                  pagina === 2
                    ? `/attivita/${risolto.slug}`
                    : `/attivita/${risolto.slug}?pagina=${pagina - 1}`
                }
                rel="prev"
                className="border-border bg-card ease-ui hover:border-primary/40 rounded-none border px-3 py-1.5 text-sm transition-colors duration-150"
              >
                Precedente
              </a>
            )}
            {pagina < pagine && (
              <a
                href={`/attivita/${risolto.slug}?pagina=${pagina + 1}`}
                rel="next"
                className="border-border bg-card ease-ui hover:border-primary/40 rounded-none border px-3 py-1.5 text-sm transition-colors duration-150"
              >
                Successiva
              </a>
            )}
            <span className="text-muted-foreground num ml-2 text-sm">
              Pagina {pagina} di {pagine}
            </span>
          </nav>
        )}

        <GrigliaCollegamenti titolo="Dove si trovano" voci={territori} />
      </div>
    </div>
  );
}
