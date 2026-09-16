import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { Briciole } from "@/components/elenco/briciole";
import { SchedaAzienda } from "@/components/elenco/scheda-azienda";
import { elencoAziende } from "@/lib/companies";
import {
  comuneDaSlug,
  regioneDaSlug,
  regioneDiSigla,
  siglaDaSlugProvincia,
  siglaToProvincia,
  slugTerritorio,
} from "@/lib/geo";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";
import { metaElenco } from "@/lib/seo-elenco";

export const revalidate = 3600;

const PER_PAGINA = 30;

type Props = {
  params: Promise<{ regione: string; provincia: string; comune: string }>;
  searchParams: Promise<{ pagina?: string }>;
};

async function risolvi(params: Props["params"]) {
  const {
    regione: slugRegione,
    provincia: slugProvincia,
    comune: slugComune,
  } = await params;

  const regione = regioneDaSlug(slugRegione);
  const sigla = siglaDaSlugProvincia(slugProvincia);
  const comune = sigla ? comuneDaSlug(slugComune, sigla) : null;
  if (!regione || !sigla || !comune) return null;

  // provincia e comune esistono davvero: se la regione dell'URL non è
  // quella vera della provincia, è l'URL a essere sbagliato (duplicato)
  const regioneReale = regioneDiSigla(sigla) ?? regione;
  const slugRegioneReale = slugTerritorio(regioneReale);

  return {
    regione: regioneReale,
    slugRegione: slugRegioneReale,
    slugProvincia,
    sigla,
    provincia: siglaToProvincia(sigla) ?? sigla,
    comune,
    fuoriRegione: slugRegioneReale !== slugRegione,
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const risolto = await risolvi(params);
  if (!risolto) return { title: "Comune non trovato", robots: { index: false } };

  const [{ comune }, { pagina }] = await Promise.all([params, searchParams]);
  return {
    ...metaElenco(
      `Aziende a ${risolto.comune}`,
      `/aziende/${risolto.slugRegione}/${risolto.slugProvincia}/${comune}`,
      Number(pagina) || 1,
    ),
    description: `Elenco delle aziende con sede a ${risolto.comune}, in provincia di ${risolto.provincia}.`,
    robots: ROBOTS_SE_DIMOSTRATIVO,
  };
}

export default async function ComunePage({ params, searchParams }: Props) {
  const risolto = await risolvi(params);
  if (!risolto) notFound();

  // provincia e comune esistono, ma sotto la regione sbagliata: mai
  // notFound (il contenuto c'è), sempre redirect alla regione vera
  if (risolto.fuoriRegione) {
    const { comune: slugComune } = await params;
    permanentRedirect(
      `/aziende/${risolto.slugRegione}/${risolto.slugProvincia}/${slugComune}`,
    );
  }

  const { pagina: grezza } = await searchParams;
  const pagina = Math.max(1, Number(grezza) || 1);

  const elenco = await elencoAziende(
    { provincia: risolto.sigla, comune: risolto.comune },
    { offset: (pagina - 1) * PER_PAGINA, limite: PER_PAGINA },
  );

  if (!elenco || elenco.totale === 0) notFound();

  const pagine = Math.max(1, Math.ceil(elenco.totale / PER_PAGINA));
  const base = `/aziende/${risolto.slugRegione}/${risolto.slugProvincia}/${(await params).comune}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Briciole
        voci={[
          { nome: risolto.regione, href: `/aziende/${risolto.slugRegione}` },
          {
            nome: risolto.provincia,
            href: `/aziende/${risolto.slugRegione}/${risolto.slugProvincia}`,
          },
          { nome: risolto.comune },
        ]}
      />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Aziende a {risolto.comune}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        <span className="num text-foreground font-medium">{elenco.totale}</span>{" "}
        {elenco.totale === 1 ? "azienda" : "aziende"} con sede a {risolto.comune},
        in provincia di {risolto.provincia}.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {elenco.risultati.map((azienda) => (
          <li key={azienda.partitaIva}>
            <SchedaAzienda azienda={azienda} />
          </li>
        ))}
      </ul>

      {pagine > 1 && (
        <nav
          aria-label="Pagine dei risultati"
          className="mt-8 flex items-center gap-2"
        >
          {pagina > 1 && (
            <a
              href={pagina === 2 ? base : `${base}?pagina=${pagina - 1}`}
              rel="prev"
              className="border-border bg-card ease-ui hover:border-primary/40 rounded-none border px-3 py-1.5 text-sm transition-colors duration-150"
            >
              Precedente
            </a>
          )}
          {pagina < pagine && (
            <a
              href={`${base}?pagina=${pagina + 1}`}
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
    </div>
  );
}
