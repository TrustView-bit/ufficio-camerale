import "server-only";

import { getCache } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { getCompanyProvider } from "@/lib/providers";

import type {
  EsitoElenco,
  EsitoRicerca,
  FiltriElenco,
  OpzioniRicerca,
  VoceAggregata,
} from "@/lib/providers/types";

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

/**
 * Elenco filtrato per territorio o settore.
 *
 * Restituisce null se il fornitore non sa enumerare il proprio archivio: le
 * API a pagamento non lo permettono, e in produzione queste pagine andranno
 * costruite sui dati già salvati in Postgres.
 */
export async function elencoAziende(
  filtri: FiltriElenco,
  opzioni: OpzioniRicerca = {},
): Promise<EsitoElenco | null> {
  const provider = getCompanyProvider();
  if (!provider.elenco) return null;

  return provider.elenco(filtri, opzioni);
}

/** Conteggi per costruire i collegamenti al livello successivo. */
export async function aggregaAziende(
  filtri: FiltriElenco,
  per: "regione" | "provincia" | "comune" | "ateco",
): Promise<VoceAggregata[]> {
  const provider = getCompanyProvider();
  if (!provider.aggrega) return [];

  return provider.aggrega(filtri, per);
}
