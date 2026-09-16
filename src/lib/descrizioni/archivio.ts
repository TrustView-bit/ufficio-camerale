import { eq } from "drizzle-orm";

import type { CacheStore } from "@/lib/cache/store";
import type { Database } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import type { CompanyData } from "@/lib/providers/types";

import { componiDescrizione, type ClienteModello } from "./genera";

/**
 * Lettura e scrittura delle descrizioni, con le dipendenze iniettate.
 *
 * Stesso impianto del repository delle aziende: qui non si tocca l'ambiente,
 * così i test possono passare una cache in memoria e un modello finto senza
 * bisogno né di chiave né di database.
 */

export type DepsDescrizione = {
  cache: CacheStore;
  /** null quando DATABASE_URL non è configurata. */
  db: Database | null;
  /** null quando manca la chiave: in quel caso non si genera nulla. */
  cliente: ClienteModello | null;
  now?: () => Date;
};

/** Un mese: una descrizione invecchia con i dati, non da sola. */
export const TTL_DESCRIZIONE_SECONDI = 60 * 60 * 24 * 30;

export function chiaveDescrizione(partitaIva: string) {
  return `descrizione:v1:${partitaIva}`;
}

/** La descrizione già scritta, se c'è. Non ne genera mai una nuova. */
export async function leggiDescrizione(
  partitaIva: string,
  deps: Pick<DepsDescrizione, "cache" | "db">,
): Promise<string | null> {
  const chiave = chiaveDescrizione(partitaIva);

  const inCache = await deps.cache.get<string>(chiave);
  if (inCache) return inCache;

  if (!deps.db) return null;

  try {
    const righe = await deps.db
      .select({ descrizione: companies.descrizione })
      .from(companies)
      .where(eq(companies.partitaIva, partitaIva))
      .limit(1);

    const salvata = righe[0]?.descrizione ?? null;
    if (salvata) {
      await deps.cache.set(chiave, salvata, TTL_DESCRIZIONE_SECONDI);
    }

    return salvata;
  } catch {
    // l'archivio irraggiungibile toglie la descrizione, non la pagina
    return null;
  }
}

/** Le richieste in volo, per non pagare due volte la stessa scheda. */
const inCorso = new Set<string>();

/**
 * Genera e salva, se serve.
 *
 * Va chiamata fuori dal percorso di risposta — nella pagina è dentro
 * `after()` — perché l'utente non deve attendere il modello.
 */
export async function generaESalvaDescrizione(
  company: CompanyData,
  deps: DepsDescrizione,
): Promise<void> {
  const { cache, db, cliente } = deps;
  if (!cliente) return;

  const partitaIva = company.partitaIva;
  if (inCorso.has(partitaIva)) return;
  if (await leggiDescrizione(partitaIva, deps)) return;

  inCorso.add(partitaIva);

  try {
    const esito = await componiDescrizione(company, cliente);
    if (esito.stato !== "scritta") return;

    await cache.set(
      chiaveDescrizione(partitaIva),
      esito.testo,
      TTL_DESCRIZIONE_SECONDI,
    );

    if (!db) return;

    const ora = deps.now?.() ?? new Date();
    await db
      .update(companies)
      .set({
        descrizione: esito.testo,
        descrizioneGeneratedAt: ora,
        descrizioneModel: esito.modello,
        // la descrizione è contenuto vero della pagina: il suo cambiamento
        // deve riflettersi nel <lastmod> della sitemap
        updatedAt: ora,
      })
      .where(eq(companies.partitaIva, partitaIva));
  } catch {
    // niente descrizione questa volta: si riproverà alla visita successiva
  } finally {
    inCorso.delete(partitaIva);
  }
}
