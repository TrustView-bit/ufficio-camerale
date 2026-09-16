import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { Briciole } from "@/components/elenco/briciole";
import { IndiceAlfabetico } from "@/components/elenco/indice-alfabetico";
import { SchedaAzienda } from "@/components/elenco/scheda-azienda";
import { aggregaAziende, elencoAziende } from "@/lib/companies";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";
import { metaElenco } from "@/lib/seo-elenco";

export const revalidate = 3600;

const PER_PAGINA = 30;

type Props = {
  params: Promise<{ lettera: string }>;
  searchParams: Promise<{ pagina?: string }>;
};

/** "a" → "A", "0-9" → "#". */
function normalizza(grezza: string): string | null {
  if (grezza === "0-9") return "#";
  const lettera = grezza.toUpperCase();
  return /^[A-Z]$/.test(lettera) ? lettera : null;
}

/** Forma canonica dello slug: minuscola, o "0-9" per la cifra — la stessa
 * generata da IndiceAlfabetico per i link interni verso questa pagina. */
function slugCanonico(lettera: string): string {
  return lettera === "#" ? "0-9" : lettera.toLowerCase();
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ lettera: grezza }, { pagina }] = await Promise.all([params, searchParams]);
  const lettera = normalizza(grezza);

  if (!lettera) return { title: "Lettera non valida", robots: { index: false } };

  const titolo =
    lettera === "#"
      ? "Aziende con denominazione che inizia per cifra"
      : `Aziende con la lettera ${lettera}`;

  return {
    ...metaElenco(
      titolo,
      `/aziende/lettera/${slugCanonico(lettera)}`,
      Number(pagina) || 1,
    ),
    description: `${titolo}: elenco alfabetico delle imprese italiane.`,
    robots: ROBOTS_SE_DIMOSTRATIVO,
  };
}

export default async function LetteraPage({ params, searchParams }: Props) {
  const { lettera: grezza } = await params;
  const lettera = normalizza(grezza);
  if (!lettera) notFound();

  // "A" e "a" sono lo stesso contenuto ma due URL distinti: si riporta
  // sempre alla forma minuscola usata dai link interni (contenuto duplicato)
  const canonico = slugCanonico(lettera);
  if (grezza !== canonico) permanentRedirect(`/aziende/lettera/${canonico}`);

  const { pagina: grezzaPagina } = await searchParams;
  const pagina = Math.max(1, Number(grezzaPagina) || 1);

  const [elenco, conteggi] = await Promise.all([
    elencoAziende(
      { iniziale: lettera },
      { offset: (pagina - 1) * PER_PAGINA, limite: PER_PAGINA },
    ),
    aggregaAziende({}, "iniziale"),
  ]);

  if (!elenco || elenco.totale === 0) notFound();

  const pagine = Math.max(1, Math.ceil(elenco.totale / PER_PAGINA));
  // oltre l'ultima pagina non c'è nulla da mostrare: niente 200 con lista
  // vuota autocanonicalizzata (spazio di URL duplicati illimitato)
  if (pagina > pagine) notFound();

  const base = `/aziende/lettera/${grezza}`;
  const mappa = new Map(conteggi.map((voce) => [voce.chiave, voce.quante]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Briciole voci={[{ nome: `Lettera ${lettera}` }]} />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {lettera === "#"
          ? "Aziende che iniziano con una cifra"
          : `Aziende con la lettera ${lettera}`}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        <span className="num text-foreground font-medium">{elenco.totale}</span>{" "}
        {elenco.totale === 1 ? "azienda" : "aziende"} in ordine alfabetico.
      </p>

      <div className="mt-6">
        <IndiceAlfabetico conteggi={mappa} attiva={lettera} />
      </div>

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
