import { desc } from "drizzle-orm";
import type { MetadataRoute } from "next";

import { getDb } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { buildAziendaSlug } from "@/lib/slug";

/** Quante schede azienda includere al massimo. */
const MAX_AZIENDE = 5000;

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;

  const statiche: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/verifica-partita-iva`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: `${base}/chi-siamo`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookie`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const db = getDb();
  if (!db) return statiche;

  // in archivio finiscono anche le schede del dataset dimostrativo: quelle
  // non vanno proposte ai motori di ricerca

  try {
    const rows = await db
      .select({
        partitaIva: companies.partitaIva,
        denominazione: companies.denominazione,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .orderBy(desc(companies.updatedAt))
      .limit(MAX_AZIENDE);

    return [
      ...statiche,
      ...rows.map((row) => ({
        url: `${base}/azienda/${buildAziendaSlug(row.denominazione, row.partitaIva)}`,
        lastModified: row.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // una sitemap parziale è meglio di una sitemap che non risponde
    return statiche;
  }
}
