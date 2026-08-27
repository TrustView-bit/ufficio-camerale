import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryCache } from "@/lib/cache/store";
import { apiCalls, companies } from "@/lib/db/schema";
import type {
  CompanyData,
  CompanyProvider,
  ProviderResult,
} from "@/lib/providers/types";

import {
  arricchisciAteco,
  getCompany,
  isStale,
  rowToCompany,
  type Database,
  type RepositoryDeps,
} from "./repository";

/** Cartella delle migrazioni: si applicano tutte, in ordine. */
const MIGRAZIONI = fileURLToPath(new URL("../../../drizzle", import.meta.url));

const AZIENDA: CompanyData = {
  partitaIva: "00743110157",
  codiceFiscale: "00743110157",
  denominazione: "Esempio Manifattura S.p.A.",
  formaGiuridica: "Società per azioni",
  statoAttivita: "attiva",
  dataCostituzione: "1962-04-17",
  reaNumero: "1305487",
  reaCciaa: "MI",
  capitaleSociale: 2_500_000,
  atecoPrimario: "25.62.00",
  atecoVersione: "2025",
  atecoPrimarioDescrizione: "Lavori di meccanica generale",
  atecoSecondari: [{ codice: "46.69.19", descrizione: "Commercio all'ingrosso" }],
  sede: {
    via: "Largo Francesco Richini 6",
    cap: "20122",
    comune: "Milano",
    provincia: "MI",
    nazione: "IT",
  },
  coordinate: null,
  codiceSdi: null,
  unitaLocali: [],
  bilanci: [
    { anno: 2024, fatturato: 18_400_000, utile: 1_150_000, dipendenti: 92 },
  ],
  pec: "esempio@pec.example.it",
  sitoWeb: "https://www.example.it",
  telefono: "+39 02 1234567",
  dipendenti: 92,
  classeDipendenti: "50-99",
};

/** Postgres vero in memoria: lo schema e le query sono eseguiti davvero. */
async function makeDb() {
  const client = new PGlite();
  const db = drizzle(client);

  const file = readdirSync(MIGRAZIONI)
    .filter((nome) => nome.endsWith(".sql"))
    .sort();

  for (const nome of file) {
    const sql = readFileSync(`${MIGRAZIONI}/${nome}`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  return db as unknown as Database;
}

/** Provider controllabile, per contare quante volte viene "pagato". */
function makeProvider(result: ProviderResult, costEur = 0.35) {
  const getByPartitaIva = vi.fn(async (): Promise<ProviderResult> => result);
  const provider: CompanyProvider = {
    name: "finto",
    costPerLookupEur: costEur,
    getByPartitaIva,
  };
  return { provider, getByPartitaIva };
}

const FOUND: ProviderResult = { status: "found", company: AZIENDA, raw: { ok: 1 } };

describe("isStale", () => {
  const now = new Date("2026-08-26T12:00:00Z");

  it("considera fresco un record recente", () => {
    expect(isStale(new Date("2026-08-20T12:00:00Z"), now, 30)).toBe(false);
  });

  it("considera stantio un record oltre la soglia", () => {
    expect(isStale(new Date("2026-06-01T12:00:00Z"), now, 30)).toBe(true);
  });

  it("rispetta una soglia diversa", () => {
    const fetchedAt = new Date("2026-08-20T12:00:00Z");
    expect(isStale(fetchedAt, now, 3)).toBe(true);
    expect(isStale(fetchedAt, now, 30)).toBe(false);
  });
});

describe("getCompany", () => {
  let deps: RepositoryDeps;
  let db: Database;

  beforeEach(async () => {
    db = await makeDb();
    deps = {
      db,
      cache: new MemoryCache(),
      provider: makeProvider(FOUND).provider,
      refreshAfterDays: 30,
      now: () => new Date("2026-08-26T12:00:00Z"),
    };
  });

  it("interroga il provider quando l'archivio è vuoto e lo salva", async () => {
    const { provider, getByPartitaIva } = makeProvider(FOUND);
    const result = await getCompany("00743110157", { ...deps, provider });

    expect(result).toMatchObject({ status: "found", source: "provider" });
    expect(getByPartitaIva).toHaveBeenCalledOnce();

    const rows = await db.select().from(companies);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.denominazione).toBe("Esempio Manifattura S.p.A.");
  });

  it("non ripaga il provider alla seconda richiesta: risponde la cache", async () => {
    const { provider, getByPartitaIva } = makeProvider(FOUND);
    const shared = { ...deps, provider };

    await getCompany("00743110157", shared);
    const second = await getCompany("00743110157", shared);

    expect(second).toMatchObject({ status: "found", source: "cache" });
    expect(getByPartitaIva).toHaveBeenCalledOnce();
  });

  it("usa l'archivio quando la cache è fredda ma il record è fresco", async () => {
    const { provider, getByPartitaIva } = makeProvider(FOUND);

    await getCompany("00743110157", { ...deps, provider });
    // cache svuotata: simula una nuova istanza serverless
    const result = await getCompany("00743110157", {
      ...deps,
      provider,
      cache: new MemoryCache(),
    });

    expect(result).toMatchObject({ status: "found", source: "database" });
    expect(getByPartitaIva).toHaveBeenCalledOnce();
  });

  it("ripaga il provider quando il record in archivio è troppo vecchio", async () => {
    const { provider, getByPartitaIva } = makeProvider(FOUND);

    await getCompany("00743110157", {
      ...deps,
      provider,
      now: () => new Date("2026-01-01T12:00:00Z"),
    });

    const result = await getCompany("00743110157", {
      ...deps,
      provider,
      cache: new MemoryCache(),
    });

    expect(result).toMatchObject({ status: "found", source: "provider" });
    expect(getByPartitaIva).toHaveBeenCalledTimes(2);
  });

  it("forceRefresh salta sia la cache sia l'archivio fresco", async () => {
    const { provider, getByPartitaIva } = makeProvider(FOUND);
    const shared = { ...deps, provider };

    await getCompany("00743110157", shared);
    const result = await getCompany("00743110157", shared, { forceRefresh: true });

    expect(result).toMatchObject({ status: "found", source: "provider" });
    expect(getByPartitaIva).toHaveBeenCalledTimes(2);
  });

  it("mostra il dato vecchio quando il provider non risponde", async () => {
    const disponibile = makeProvider(FOUND);
    await getCompany("00743110157", {
      ...deps,
      provider: disponibile.provider,
      now: () => new Date("2026-01-01T12:00:00Z"),
    });

    const giu = makeProvider({ status: "unavailable", reason: "TIMEOUT" });
    const result = await getCompany("00743110157", {
      ...deps,
      provider: giu.provider,
      cache: new MemoryCache(),
    });

    expect(result).toMatchObject({ status: "found", source: "database-stale" });
    expect(result).toHaveProperty("fetchedAt");
    if (result.status === "found") {
      expect(result.fetchedAt.toISOString()).toBe("2026-01-01T12:00:00.000Z");
    }
  });

  it("dichiara l'indisponibilità solo se non c'è nulla in archivio", async () => {
    const giu = makeProvider({ status: "unavailable", reason: "QUOTA_EXCEEDED" });
    const result = await getCompany("00743110157", {
      ...deps,
      provider: giu.provider,
    });

    expect(result).toEqual({ status: "unavailable", reason: "QUOTA_EXCEEDED" });
  });

  it("distingue l'impresa inesistente dal servizio giù", async () => {
    const assente = makeProvider({ status: "not-found" });
    const result = await getCompany("00743110157", {
      ...deps,
      provider: assente.provider,
    });

    expect(result).toEqual({ status: "not-found" });
  });

  it("registra ogni chiamata a pagamento con il costo stimato", async () => {
    const { provider } = makeProvider(FOUND, 0.35);
    await getCompany("00743110157", { ...deps, provider });

    const calls = await db.select().from(apiCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      provider: "finto",
      partitaIva: "00743110157",
      outcome: "found",
      costEur: "0.3500",
      servedFromCache: false,
    });
  });

  it("non registra nulla quando la risposta viene dalla cache", async () => {
    const { provider } = makeProvider(FOUND);
    const shared = { ...deps, provider };

    await getCompany("00743110157", shared);
    await getCompany("00743110157", shared);

    const calls = await db.select().from(apiCalls);
    expect(calls).toHaveLength(1);
  });

  it("funziona anche senza database, pagando ogni volta", async () => {
    const { provider, getByPartitaIva } = makeProvider(FOUND);
    const senzaDb = { ...deps, db: null, provider, cache: new MemoryCache() };

    const first = await getCompany("00743110157", senzaDb);
    expect(first).toMatchObject({ status: "found", source: "provider" });

    // la cache calda copre comunque la seconda richiesta
    const second = await getCompany("00743110157", senzaDb);
    expect(second).toMatchObject({ source: "cache" });
    expect(getByPartitaIva).toHaveBeenCalledOnce();
  });

  it("conserva i campi strutturati passando dall'archivio", async () => {
    const { provider } = makeProvider(FOUND);
    await getCompany("00743110157", { ...deps, provider });

    const rows = await db.select().from(companies);
    const company = rowToCompany(rows[0]!);

    expect(company.capitaleSociale).toBe(2_500_000);
    expect(company.sede?.comune).toBe("Milano");
    expect(company.atecoSecondari).toHaveLength(1);
    expect(company.bilanci[0]?.fatturato).toBe(18_400_000);
  });

  it("aggiorna il record esistente invece di duplicarlo", async () => {
    const { provider } = makeProvider(FOUND);
    await getCompany("00743110157", { ...deps, provider });

    const aggiornato = makeProvider({
      status: "found",
      company: { ...AZIENDA, denominazione: "Esempio Manifattura S.r.l." },
      raw: {},
    });
    await getCompany(
      "00743110157",
      { ...deps, provider: aggiornato.provider },
      { forceRefresh: true },
    );

    const rows = await db.select().from(companies);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.denominazione).toBe("Esempio Manifattura S.r.l.");
  });
});

describe("arricchisciAteco", () => {
  it("risolve la descrizione sui dati Istat", () => {
    const risultato = arricchisciAteco({
      ...AZIENDA,
      atecoPrimario: "62.10.00",
      atecoVersione: "2025",
      atecoPrimarioDescrizione: null,
    });

    expect(risultato.atecoPrimarioDescrizione).toBe(
      "Attività di programmazione informatica",
    );
  });

  it("non tocca il codice grezzo, nemmeno convertendo dal 2022", () => {
    const risultato = arricchisciAteco({
      ...AZIENDA,
      atecoPrimario: "62.01.00",
      atecoVersione: "2022",
      atecoPrimarioDescrizione: null,
    });

    expect(risultato.atecoPrimario).toBe("62.01.00");
    expect(risultato.atecoPrimarioDescrizione).toBe(
      "Attività di programmazione informatica",
    );
  });

  it("deduce la classificazione quando il fornitore non la dichiara", () => {
    const risultato = arricchisciAteco({
      ...AZIENDA,
      atecoPrimario: "62.01.00",
      atecoVersione: null,
      atecoPrimarioDescrizione: null,
    });

    expect(risultato.atecoVersione).toBe("2022");
  });

  it("conserva la descrizione del fornitore se Istat non riconosce il codice", () => {
    const risultato = arricchisciAteco({
      ...AZIENDA,
      atecoPrimario: "04.99.99",
      atecoVersione: null,
      atecoPrimarioDescrizione: "Descrizione del fornitore",
    });

    expect(risultato.atecoPrimarioDescrizione).toBe("Descrizione del fornitore");
  });
});
