import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

/** Sede legale o unità locale. */
export type Indirizzo = {
  via: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  nazione: string | null;
};

export type Ateco = {
  codice: string;
  descrizione: string | null;
};

export type UnitaLocale = {
  denominazione: string | null;
  indirizzo: Indirizzo;
  ateco: string | null;
};

export type Bilancio = {
  anno: number;
  fatturato: number | null;
  utile: number | null;
  dipendenti: number | null;
};

/**
 * Archivio permanente delle aziende interrogate.
 *
 * Ogni riga è il risultato di un'interrogazione a pagamento: si conserva per
 * riusarla invece di ricomprarla. `fetchedAt` dice quando il dato è stato
 * scaricato, ed è ciò che determina se è ancora fresco.
 */
export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),

    partitaIva: varchar("partita_iva", { length: 11 }).notNull().unique(),
    codiceFiscale: varchar("codice_fiscale", { length: 16 }),

    denominazione: text("denominazione").notNull(),
    /** La denominazione ridotta alla forma confrontabile da `chiaveRicerca`:
        senza accenti né punteggiatura, con le sigle ricomposte ("s.p.a." →
        "spa"). Si scrive qui perché quella normalizzazione è codice
        JavaScript, e rifarla in SQL a ogni ricerca darebbe risultati diversi
        dalla ricerca in memoria. */
    denominazioneRicerca: text("denominazione_ricerca"),
    formaGiuridica: text("forma_giuridica"),
    /** attiva | cessata | in-liquidazione | sconosciuto */
    statoAttivita: text("stato_attivita").notNull().default("sconosciuto"),
    dataCostituzione: date("data_costituzione"),

    reaNumero: text("rea_numero"),
    reaCciaa: text("rea_cciaa"),
    capitaleSociale: numeric("capitale_sociale", { precision: 15, scale: 2 }),

    /** Codice così come arriva dal fornitore: non va mai sovrascritto con
        quello convertito, altrimenti al prossimo raccordo Istat non si
        potrebbe più ricalcolare nulla. */
    atecoPrimario: text("ateco_primario"),
    /** Classificazione in cui è espresso il codice grezzo: 2022 o 2025. */
    atecoVersione: text("ateco_versione"),
    /** Descrizione risolta sui dataset Istat al momento della scrittura. */
    atecoPrimarioDescrizione: text("ateco_primario_descrizione"),
    atecoSecondari: jsonb("ateco_secondari").$type<Ateco[]>().default([]),

    sede: jsonb("sede").$type<Indirizzo | null>(),
    /** Coordinate della sede, quando il fornitore le dà: non del comune. */
    latitudine: numeric("latitudine", { precision: 9, scale: 6 }),
    longitudine: numeric("longitudine", { precision: 9, scale: 6 }),
    /** Codice destinatario per la fatturazione elettronica. */
    codiceSdi: text("codice_sdi"),
    unitaLocali: jsonb("unita_locali").$type<UnitaLocale[]>().default([]),
    bilanci: jsonb("bilanci").$type<Bilancio[]>().default([]),

    pec: text("pec"),
    sitoWeb: text("sito_web"),
    telefono: text("telefono"),

    dipendenti: integer("dipendenti"),
    classeDipendenti: text("classe_dipendenti"),

    // Descrizione generata (step 6)
    descrizione: text("descrizione"),
    descrizioneGeneratedAt: timestamp("descrizione_generated_at", {
      withTimezone: true,
    }),
    descrizioneModel: text("descrizione_model"),

    /** Provider che ha fornito il dato e risposta grezza, per il debug. */
    providerName: text("provider_name").notNull(),
    providerRaw: jsonb("provider_raw"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("companies_denominazione_idx").on(table.denominazione),
    index("companies_denominazione_ricerca_idx").on(table.denominazioneRicerca),
    index("companies_fetched_at_idx").on(table.fetchedAt),
  ],
);

/**
 * Registro di ogni chiamata a un provider esterno, con il costo stimato.
 * Serve a sapere quanto si sta spendendo prima che arrivi la fattura.
 */
export const apiCalls = pgTable(
  "api_calls",
  {
    id: serial("id").primaryKey(),

    provider: text("provider").notNull(),
    endpoint: text("endpoint").notNull(),
    partitaIva: varchar("partita_iva", { length: 11 }),

    /** found | not-found | unavailable | invalid */
    outcome: text("outcome").notNull(),
    httpStatus: integer("http_status"),
    durationMs: integer("duration_ms"),

    /** Costo stimato in euro della singola chiamata. */
    costEur: numeric("cost_eur", { precision: 10, scale: 4 })
      .notNull()
      .default("0"),
    /** false quando la chiamata è stata effettivamente pagata. */
    servedFromCache: boolean("served_from_cache").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("api_calls_created_at_idx").on(table.createdAt),
    index("api_calls_provider_idx").on(table.provider),
  ],
);

/**
 * Da quale elenco viene ciascun campo di ciascuna impresa.
 *
 * Serve a due cose concrete: decidere chi vince quando due fonti danno lo
 * stesso campo, e poter rispondere «questo dato viene da qui, acquisito il
 * tal giorno» quando un'impresa contesta ciò che pubblichiamo.
 */
export const impresaFonti = pgTable(
  "impresa_fonti",
  {
    id: serial("id").primaryKey(),

    partitaIva: varchar("partita_iva", { length: 11 }).notNull(),
    /** Nome del campo di `companies`, in forma canonica. */
    campo: text("campo").notNull(),

    fonte: text("fonte").notNull(),
    /** Priorità della fonte al momento della scrittura. */
    priorita: integer("priorita").notNull(),
    /** Quando la fonte ha rilevato il dato. */
    acquisitoIl: timestamp("acquisito_il", { withTimezone: true }).notNull(),

    aggiornatoIl: timestamp("aggiornato_il", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("impresa_fonti_campo_unico").on(table.partitaIva, table.campo),
    index("impresa_fonti_partita_iva_idx").on(table.partitaIva),
  ],
);

export type CompanyRow = typeof companies.$inferSelect;
export type NewCompanyRow = typeof companies.$inferInsert;
export type NewApiCall = typeof apiCalls.$inferInsert;
export type ImpresaFonteRow = typeof impresaFonti.$inferSelect;
