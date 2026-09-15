import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Briciole } from "@/components/elenco/briciole";
import { GrigliaCollegamenti } from "@/components/elenco/griglia-collegamenti";
import { aggregaAziende } from "@/lib/companies";
import { provinceDiRegione, regioneDaSlug, regioni } from "@/lib/geo";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ regione: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { regione: slug } = await params;
  const regione = regioneDaSlug(slug);

  if (!regione) return { title: "Regione non trovata", robots: { index: false } };

  return {
    title: `Aziende in ${regione}`,
    description: `Elenco delle aziende con sede in ${regione}, per provincia e per comune.`,
    alternates: { canonical: `/aziende/${slug}` },
    robots: ROBOTS_SE_DIMOSTRATIVO,
  };
}

export default async function RegionePage({ params }: Props) {
  const { regione: slug } = await params;
  const regione = regioneDaSlug(slug);
  if (!regione) notFound();

  const conteggi = await aggregaAziende({ regione }, "provincia");
  const perSigla = new Map(conteggi.map((voce) => [voce.chiave, voce.quante]));

  const voci = provinceDiRegione(regione)
    .map((provincia) => ({
      nome: provincia.nome,
      href: `/aziende/${slug}/${provincia.slug}`,
      quante: perSigla.get(provincia.sigla) ?? 0,
    }))
    .filter((voce) => voce.quante > 0);

  const totale = voci.reduce((somma, voce) => somma + voce.quante, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Briciole voci={[{ nome: regione }]} />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Aziende in {regione}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        <span className="num text-foreground font-medium">{totale}</span> aziende
        con sede in {regione}, distribuite in {voci.length}{" "}
        {voci.length === 1 ? "provincia" : "province"}.
      </p>

      <div className="mt-8">
        <GrigliaCollegamenti titolo="Province" voci={voci} />
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return regioni().map((regione) => ({ regione: regione.slug }));
}
