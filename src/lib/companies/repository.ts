import { eq } from "drizzle-orm";

import { descriviAteco } from "@/lib/ateco";
import type { CacheStore } from "@/lib/cache/store";
// Lo schema si importa direttamente: `@/lib/db` include "server-only",
// che non è caricabile dai test. Il tipo Database, essendo solo un tipo,
// viene cancellato in compilazione e non trascina l'import.
import { apiCalls, companies, type CompanyRow } from "@/lib/db/schema";
import type { Database } from "@/lib/db";

export type { Database };
import type {
  CompanyData,
  CompanyProvider,
  ProviderUnavailableReason,
} from "@/lib/providers/types";

/** Da dove arriva il dato mostrato all'utente. */
export type CompanySource =
  | "cache"
  | "database"
  | "provider"
  /** Archivio non più fresco, mostrato perché il provider non risponde. */
  | "database-stale";

export type CompanyLookup =
  | {
      status: "found";
      company: CompanyData;
      source: CompanySource;
      /** Quando il dato è stato scaricato dal provider. */
      fetchedAt: Date;
    }
  | { status: "not-found" }
  | { status: "unavailable"; reason: ProviderUnavailableReason };

export type RepositoryDeps = {
  /** null quando DATABASE_URL non è configurata. */
  db: Database | null;
  cache: CacheStore;
  provider: CompanyProvider;
  refreshAfterDays: number;
  now?: () => Date;
};

/** Durata della cache calda: un giorno. */
export const CACHE_TTL_SECONDS = 60 * 60 * 24;

type CachedEntry = { company: CompanyData; fetchedAt: string };

function cacheKey(partitaIva: string) {
  return `company:v1:${partitaIva}`;
}

/** Il numerico di Postgres arriva come stringa: va riconvertito. */
function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Risolve la descrizione ATECO sui dataset Istat, conservando intatto il
 * codice grezzo del fornitore. La descrizione del fornitore resta come
 * ripiego: meglio la sua che nessuna, se Istat non riconosce il codice.
 */
export function arricchisciAteco(company: CompanyData): CompanyData {
  if (!company.atecoPrimario) return company;

  const risolto = descriviAteco(
    company.atecoPrimario,
    company.atecoVersione ?? undefined,
  );
  if (!risolto) return company;

  return {
    ...company,
    // la versione riconosciuta va conservata: serve a ricalcolare tutto
    // quando Istat pubblicherà il raccordo successivo
    atecoVersione: company.atecoVersione ?? risolto.versioneRisolta,
    atecoPrimarioDescrizione: risolto.descrizione,
  };
}

export function rowToCompany(row: CompanyRow): CompanyData {
  return {
    partitaIva: row.partitaIva,
    codiceFiscale: row.codiceFiscale,
    denominazione: row.denominazione,
    formaGiuridica: row.formaGiuridica,
    statoAttivita: row.statoAttivita as CompanyData["statoAttivita"],
    dataCostituzione: row.dataCostituzione,
    reaNumero: row.reaNumero,
    reaCciaa: row.reaCciaa,
    capitaleSociale: toNumber(row.capitaleSociale),
    atecoPrimario: row.atecoPrimario,
    atecoVersione: (row.atecoVersione as CompanyData["atecoVersione"]) ?? null,
    atecoPrimarioDescrizione: row.atecoPrimarioDescrizione,
    atecoSecondari: row.atecoSecondari ?? [],
    sede: row.sede ?? null,
    unitaLocali: row.unitaLocali ?? [],
    bilanci: row.bilanci ?? [],
    pec: row.pec,
    sitoWeb: row.sitoWeb,
    telefono: row.telefono,
    dipendenti: row.dipendenti,
    classeDipendenti: row.classeDipendenti,
  };
}

/** Un record è stantio quando è più vecchio della soglia configurata. */
export function isStale(fetchedAt: Date, now: Date, refreshAfterDays: number) {
  const ageMs = now.getTime() - fetchedAt.getTime();
  return ageMs > refreshAfterDays * 24 * 60 * 60 * 1000;
}

/**
 * Recupera i dati camerali di un'impresa.
 *
 * L'ordine delle fonti è quello che tiene bassa la spesa: cache calda →
 * archivio permanente → provider a pagamento. Il provider viene interrogato
 * solo se l'archivio è vuoto, se il record è più vecchio della soglia, o se
 * l'utente ha chiesto esplicitamente un aggiornamento.
 *
 * Se il provider non risponde ma in archivio c'è un record vecchio, si mostra
 * quello: dati datati e dichiarati tali sono più utili di una pagina d'errore.
 */
export async function getCompany(
  partitaIva: string,
  deps: RepositoryDeps,
  options: { forceRefresh?: boolean } = {},
): Promise<CompanyLookup> {
  const { db, cache, provider, refreshAfterDays } = deps;
  const now = deps.now?.() ?? new Date();
  const forceRefresh = options.forceRefresh ?? false;
  const key = cacheKey(partitaIva);

  if (!forceRefresh) {
    const hit = await cache.get<CachedEntry>(key);
    if (hit) {
      return {
        status: "found",
        company: hit.company,
        source: "cache",
        fetchedAt: new Date(hit.fetchedAt),
      };
    }
  }

  const row = await findRow(db, partitaIva);

  if (row && !forceRefresh && !isStale(row.fetchedAt, now, refreshAfterDays)) {
    const company = rowToCompany(row);
    await cache.set<CachedEntry>(
      key,
      { company, fetchedAt: row.fetchedAt.toISOString() },
      CACHE_TTL_SECONDS,
    );
    return {
      status: "found",
      company,
      source: "database",
      fetchedAt: row.fetchedAt,
    };
  }

  // Da qui in poi si paga
  const startedAt = Date.now();
  const result = await provider.getByPartitaIva(partitaIva);
  const durationMs = Date.now() - startedAt;

  await logApiCall(db, {
    provider: provider.name,
    endpoint: `getByPartitaIva/${partitaIva}`,
    partitaIva,
    outcome: result.status,
    httpStatus: result.httpStatus ?? null,
    durationMs,
    costEur: provider.costPerLookupEur.toFixed(4),
    servedFromCache: false,
  });

  if (result.status === "found") {
    const company = arricchisciAteco(result.company);

    await upsertRow(db, company, provider.name, result.raw, now);
    await cache.set<CachedEntry>(
      key,
      { company, fetchedAt: now.toISOString() },
      CACHE_TTL_SECONDS,
    );
    return { status: "found", company, source: "provider", fetchedAt: now };
  }

  if (result.status === "unavailable") {
    // Ripiego sull'archivio: meglio un dato vecchio e dichiarato tale
    if (row) {
      return {
        status: "found",
        company: rowToCompany(row),
        source: "database-stale",
        fetchedAt: row.fetchedAt,
      };
    }
    return { status: "unavailable", reason: result.reason };
  }

  return { status: "not-found" };
}

async function findRow(
  db: Database | null,
  partitaIva: string,
): Promise<CompanyRow | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.partitaIva, partitaIva))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    // Un archivio irraggiungibile non deve impedire di interrogare il provider
    return null;
  }
}

async function upsertRow(
  db: Database | null,
  company: CompanyData,
  providerName: string,
  raw: unknown,
  now: Date,
) {
  if (!db) return;

  const values = {
    partitaIva: company.partitaIva,
    codiceFiscale: company.codiceFiscale,
    denominazione: company.denominazione,
    formaGiuridica: company.formaGiuridica,
    statoAttivita: company.statoAttivita,
    dataCostituzione: company.dataCostituzione,
    reaNumero: company.reaNumero,
    reaCciaa: company.reaCciaa,
    capitaleSociale: company.capitaleSociale?.toFixed(2) ?? null,
    atecoPrimario: company.atecoPrimario,
    atecoVersione: company.atecoVersione,
    atecoPrimarioDescrizione: company.atecoPrimarioDescrizione,
    atecoSecondari: company.atecoSecondari,
    sede: company.sede,
    unitaLocali: company.unitaLocali,
    bilanci: company.bilanci,
    pec: company.pec,
    sitoWeb: company.sitoWeb,
    telefono: company.telefono,
    dipendenti: company.dipendenti,
    classeDipendenti: company.classeDipendenti,
    providerName,
    providerRaw: raw,
    fetchedAt: now,
    updatedAt: now,
  };

  try {
    await db
      .insert(companies)
      .values(values)
      .onConflictDoUpdate({ target: companies.partitaIva, set: values });
  } catch {
    // La scrittura in archivio è un'ottimizzazione di costo, non un requisito
    // per rispondere all'utente: se fallisce, si prosegue.
  }
}

async function logApiCall(
  db: Database | null,
  values: {
    provider: string;
    endpoint: string;
    partitaIva: string;
    outcome: string;
    httpStatus: number | null;
    durationMs: number;
    costEur: string;
    servedFromCache: boolean;
  },
) {
  if (!db) return;
  try {
    await db.insert(apiCalls).values(values);
  } catch {
    // idem: il log dei costi non deve mai far fallire una richiesta
  }
}
