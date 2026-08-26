import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { env, features } from "@/lib/env";

import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let cached: Database | null = null;

/**
 * Connessione al database, creata alla prima richiesta.
 *
 * Restituisce null quando DATABASE_URL non è configurata: il portale
 * funziona lo stesso, ma senza archivio permanente ogni interrogazione
 * ripaga il provider. Chi chiama deve gestire il caso.
 */
export function getDb(): Database | null {
  if (!features.database) return null;
  cached ??= drizzle(neon(env.DATABASE_URL!), { schema });
  return cached;
}

export * from "./schema";
