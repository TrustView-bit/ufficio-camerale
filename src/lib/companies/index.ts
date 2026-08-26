import "server-only";

import { getCache } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { getCompanyProvider } from "@/lib/providers";

import type { EsitoRicerca, OpzioniRicerca } from "@/lib/providers/types";

import { getCompany, type CompanyLookup } from "./repository";

export * from "./repository";

/**
 * Recupera un'azienda usando le dipendenze reali configurate nell'ambiente.
 * Il repository resta iniettabile, così i test possono sostituire archivio,
 * cache e provider senza toccare l'ambiente.
 */
export function lookupCompany(
  partitaIva: string,
  options: { forceRefresh?: boolean } = {},
): Promise<CompanyLookup> {
  return getCompany(
    partitaIva,
    {
      db: getDb(),
      cache: getCache(),
      provider: getCompanyProvider(),
      refreshAfterDays: env.REFRESH_AFTER_DAYS,
    },
    options,
  );
}

/**
 * Cerca aziende per ragione sociale.
 *
 * Restituisce null quando il fornitore configurato non offre la ricerca per
 * nome: la pagina lo dice apertamente, invece di mostrare zero risultati come
 * se non esistesse nulla.
 */
export async function cercaAziende(
  query: string,
  opzioni: OpzioniRicerca = {},
): Promise<EsitoRicerca | null> {
  const provider = getCompanyProvider();
  if (!provider.cercaPerNome) return null;

  return provider.cercaPerNome(query, opzioni);
}
