import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";

import { env, features } from "@/lib/env";

import * as schema from "./schema";

/**
 * Il tipo è quello comune ai due driver: le query del progetto usano solo
 * l'API condivisa (select/insert/update, sql``), quindi chi chiama non deve
 * sapere quale dei due c'è sotto.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Database | null = null;

/**
 * Connessione al database, creata alla prima richiesta.
 *
 * Restituisce null quando DATABASE_URL non è configurata: il portale
 * funziona lo stesso, ma senza archivio permanente ogni interrogazione
 * ripaga il provider. Chi chiama deve gestire il caso.
 *
 * Il driver si sceglie dall'indirizzo: Neon vuole il suo client HTTP (è
 * l'unico che funziona sul suo endpoint serverless), qualunque altro Postgres
 * — Supabase, Vercel Postgres, un'istanza propria — passa dal driver
 * standard su TCP.
 */
export function getDb(): Database | null {
  if (!features.database) return null;

  const url = env.DATABASE_URL!;

  cached ??= url.includes("neon.tech")
    ? (drizzleNeon(neon(url), { schema }) as unknown as Database)
    : (drizzlePostgres(
        // `prepare: false` serve ai pooler in modalità transaction (Supabase
        // sulla porta 6543): le prepared statement lì non sopravvivono
        postgres(url, { prepare: false, max: 5 }),
        { schema },
      ) as unknown as Database);

  return cached;
}

export * from "./schema";
