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
  Raggruppamento,
  VoceAggregata,
} from "@/lib/providers/types";

import { aggregaInArchivio, cercaInArchivio, elencoInArchivio } from "./archivio";
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
  // prima l'archivio: è lì che vivono le aziende già interrogate
  const db = getDb();
  if (db) return cercaInArchivio(db, query, opzioni);

  const provider = getCompanyProvider();
  return provider.cercaPerNome?.(query, opzioni) ?? null;
}

/**
 * Elenco filtrato per territorio o settore.
 *
 * Si costruisce sull'archivio: un'API a pagamento non lascia enumerare il
 * proprio contenuto, quindi queste pagine crescono con le aziende che
 * qualcuno ha già cercato.
 */
export async function elencoAziende(
  filtri: FiltriElenco,
  opzioni: OpzioniRicerca = {},
): Promise<EsitoElenco | null> {
  const db = getDb();
  if (db) return elencoInArchivio(db, filtri, opzioni);

  const provider = getCompanyProvider();
  return provider.elenco?.(filtri, opzioni) ?? null;
}

/** Conteggi per costruire i collegamenti al livello successivo. */
export async function aggregaAziende(
  filtri: FiltriElenco,
  per: Raggruppamento,
): Promise<VoceAggregata[]> {
  const db = getDb();
  if (db) return aggregaInArchivio(db, filtri, per);

  const provider = getCompanyProvider();
  return provider.aggrega?.(filtri, per) ?? [];
}
