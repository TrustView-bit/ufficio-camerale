/**
 * Riempie `denominazione_ricerca` sulle righe già in archivio.
 *
 *   npm run db:backfill-ricerca
 *   npm run db:backfill-ricerca -- --prova
 *
 * La colonna è arrivata dopo i dati: la migrazione 0004 la aggiunge vuota, e
 * finché resta vuota la ricerca ripiega su `lower(denominazione)` — trova
 * comunque, ma non riconosce le sigle ("eni spa" non trova "ENI S.P.A.").
 * Questo script chiude la differenza. È idempotente: rieseguirlo non cambia
 * nulla.
 */

import { neon } from "@neondatabase/serverless";
import { isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

// la connessione si costruisce qui invece di riusare `@/lib/db`: quel modulo
// è marcato "server-only" e non è importabile da uno script
import { companies } from "../src/lib/db/schema";
import { chiaveRicerca } from "../src/lib/ricerca";

const prova = process.argv.includes("--prova");

async function main() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("DATABASE_URL non è configurata: non c'è nulla da riempire.");
    process.exitCode = 1;
    return;
  }

  const db = drizzle(neon(url));

  const righe = await db
    .select({
      partitaIva: companies.partitaIva,
      denominazione: companies.denominazione,
    })
    .from(companies)
    .where(isNull(companies.denominazioneRicerca));

  console.log(`${righe.length} righe da riempire.`);
  if (righe.length === 0 || prova) {
    if (prova) console.log("Prova: nessuna scrittura.");
    return;
  }

  // un solo UPDATE con una VALUES: migliaia di query separate su HTTP
  // costerebbero minuti, e il driver di Neon non ha transazioni
  const BLOCCO = 500;
  let fatte = 0;

  for (let i = 0; i < righe.length; i += BLOCCO) {
    const blocco = righe.slice(i, i + BLOCCO);

    const valori = sql.join(
      blocco.map(
        (riga) => sql`(${riga.partitaIva}, ${chiaveRicerca(riga.denominazione)})`,
      ),
      sql`, `,
    );

    await db.execute(sql`
      update ${companies} set denominazione_ricerca = v.chiave
      from (values ${valori}) as v(partita_iva, chiave)
      where ${companies.partitaIva} = v.partita_iva
    `);

    fatte += blocco.length;
    console.log(`  ${fatte}/${righe.length}`);
  }

  console.log("Fatto.");
}

main().catch((errore) => {
  console.error(errore);
  process.exitCode = 1;
});
