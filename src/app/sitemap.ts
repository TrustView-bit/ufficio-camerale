import { desc, sql } from "drizzle-orm";
import type { MetadataRoute } from "next";

import { divisioni, slugAteco } from "@/lib/ateco";
import { aggregaAziende } from "@/lib/companies";
import { datiSostanzialiSql } from "@/lib/companies/archivio";
import { getDb } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { provinceDiRegione, slugTerritorio } from "@/lib/geo";
import { daElenchiPubblici } from "@/lib/providers/mock";
import { schedaIndicizzabile, SOGLIA_INDICIZZAZIONE } from "@/lib/scheda";
import { DATI_REALI } from "@/lib/seo";
import { buildAziendaSlug } from "@/lib/slug";

/** Quante schede azienda includere al massimo. */
const MAX_AZIENDE = 5000;

export const revalidate = 86400;

/**
 * Le pagine di navigazione — regioni, province, settori — sono nate per
 * essere percorse: lasciarle fuori dalla sitemap significava affidarne la
 * scoperta al solo passaparola dei collegamenti interni.
 *
 * I comuni restano fuori di proposito: sono migliaia, e ognuno costerebbe
 * un'interrogazione di conteggio. Ci si arriva dalla pagina della provincia,
 * che è in elenco.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;

  const statiche: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/verifica-partita-iva`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: `${base}/aziende`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/attivita`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/chi-siamo`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookie`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [territorio, settori, aziende] = await Promise.all([
    pagineTerritorio(base),
    pagineSettore(base),
    schedeAzienda(base),
  ]);

  return [...statiche, ...territorio, ...settori, ...aziende];
}

/** Regioni e province in cui l'archivio ha almeno un'azienda. */
async function pagineTerritorio(base: string): Promise<MetadataRoute.Sitemap> {
  const perRegione = await aggregaAziende({}, "regione");
  if (perRegione.length === 0) return [];

  const perProvincia = await aggregaAziende({}, "provincia");
  const sigleConAziende = new Set(perProvincia.map((voce) => voce.chiave));

  const voci: MetadataRoute.Sitemap = [];

  for (const regione of perRegione) {
    const slugRegione = slugTerritorio(regione.chiave);
    voci.push({
      url: `${base}/aziende/${slugRegione}`,
      changeFrequency: "weekly",
      priority: 0.6,
    });

    for (const provincia of provinceDiRegione(regione.chiave)) {
      if (!sigleConAziende.has(provincia.sigla)) continue;

      voci.push({
        url: `${base}/aziende/${slugRegione}/${provincia.slug}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return voci;
}

/** Divisioni ATECO in cui l'archivio ha almeno un'azienda. */
async function pagineSettore(base: string): Promise<MetadataRoute.Sitemap> {
  const conteggi = await aggregaAziende({}, "ateco");
  const conAziende = new Set(conteggi.map((voce) => voce.chiave));

  return divisioni()
    .filter((divisione) => conAziende.has(divisione.codice))
    .map((divisione) => ({
      url: `${base}/attivita/${slugAteco(divisione.codice, divisione.titolo)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
}

/**
 * Solo le schede che hanno qualcosa da dire.
 *
 * È la stessa soglia di `schedaIndicizzabile`, riscritta in SQL: una scheda
 * marcata `noindex` non va comunque proposta nella sitemap, o si chiederebbe
 * al motore di visitare pagine che gli si è appena detto di non indicizzare.
 */
async function schedeAzienda(base: string): Promise<MetadataRoute.Sitemap> {
  const db = getDb();

  if (db) {
    try {
      const rows = await db
        .select({
          partitaIva: companies.partitaIva,
          denominazione: companies.denominazione,
          updatedAt: companies.updatedAt,
        })
        .from(companies)
        .where(sql`${datiSostanzialiSql} >= ${SOGLIA_INDICIZZAZIONE}`)
        .orderBy(desc(companies.updatedAt))
        .limit(MAX_AZIENDE);

      return rows.map((row) => ({
        url: `${base}/azienda/${buildAziendaSlug(row.denominazione, row.partitaIva)}`,
        lastModified: row.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
    } catch {
      return [];
    }
  }

  // stessa soglia di sostanza del ramo con database (schedaIndicizzabile):
  // altrimenti si proporrebbero schede che la pagina stessa marca `noindex`
  return Object.values(daElenchiPubblici())
    .filter((azienda) => schedaIndicizzabile(azienda))
    .map((azienda) => ({
      url: `${base}/azienda/${buildAziendaSlug(azienda.denominazione, azienda.partitaIva)}`,
      changeFrequency: "monthly" as const,
      priority: 1,
    }));
}
