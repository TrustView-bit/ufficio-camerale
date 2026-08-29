import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";

import { companies } from "@/lib/db/schema";
import { chiaveRicerca } from "@/lib/ricerca";
import { SOGLIA_INDICIZZAZIONE } from "@/lib/scheda";

import { cercaInArchivio, datiSostanzialiSql } from "./archivio";
import type { Database } from "./repository";

const MIGRAZIONI = fileURLToPath(new URL("../../../drizzle", import.meta.url));

/** Postgres vero in memoria: l'ordinamento è quello che girerà in produzione. */
async function makeDb() {
  const client = new PGlite();
  const db = drizzle(client);

  for (const nome of readdirSync(MIGRAZIONI)
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(`${MIGRAZIONI}/${nome}`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement.trim());
    }
  }

  return db as unknown as Database;
}

const AZIENDE: [string, string][] = [
  ["00905811006", "ENI S.P.A."],
  ["11076280962", "ENI GLOBAL ENERGY MARKETS S.P.A."],
  ["00991340969", "THALES ALENIA SPACE ITALIA S.P.A."],
  ["10810700152", "INTESA SANPAOLO S.P.A."],
];

let db: Database;

beforeEach(async () => {
  db = await makeDb();

  for (const [partitaIva, denominazione] of AZIENDE) {
    await db.insert(companies).values({
      partitaIva,
      denominazione,
      denominazioneRicerca: chiaveRicerca(denominazione),
      providerName: "test",
      fetchedAt: new Date(),
    });
  }
});

async function nomi(query: string) {
  const esito = await cercaInArchivio(db, query);
  return esito.risultati.map((riga) => riga.denominazione);
}

describe("cercaInArchivio", () => {
  it("trova una sigla scritta senza punti, e la mette prima", async () => {
    // "ENI S.P.A." in archivio è "eni spa": senza normalizzazione la ricerca
    // "eni spa" non troverebbe nulla. Le altre restano fra i risultati —
    // contengono entrambe le parole — ma dietro.
    expect((await nomi("eni spa"))[0]).toBe("ENI S.P.A.");
  });

  it("mette prima chi apre il nome, poi chi lo contiene", async () => {
    const risultati = await nomi("eni");

    expect(risultati[0]).toBe("ENI S.P.A.");
    expect(risultati).toContain("THALES ALENIA SPACE ITALIA S.P.A.");
    expect(risultati.indexOf("ENI GLOBAL ENERGY MARKETS S.P.A.")).toBeLessThan(
      risultati.indexOf("THALES ALENIA SPACE ITALIA S.P.A."),
    );
  });

  it("ignora accenti e punteggiatura digitati", async () => {
    expect(await nomi("intesa sanpaolo")).toEqual(["INTESA SANPAOLO S.P.A."]);
    expect((await nomi("èni s.p.a."))[0]).toBe("ENI S.P.A.");
  });

  it("richiede tutte le parole digitate", async () => {
    expect(await nomi("eni banca")).toEqual([]);
  });

  it("conta le province prima di filtrare", async () => {
    const esito = await cercaInArchivio(db, "eni");
    expect(esito.totale).toBe(3);
  });
});

describe("la soglia della sitemap", () => {
  it("è la stessa regola di schedaIndicizzabile, scritta in SQL", async () => {
    // una scheda con solo nome e sede resta fuori; con tre dati entra
    await db.insert(companies).values([
      {
        partitaIva: "01790820623",
        denominazione: "MAGRA S.R.L.",
        denominazioneRicerca: chiaveRicerca("MAGRA S.R.L."),
        providerName: "test",
        fetchedAt: new Date(),
      },
      {
        partitaIva: "01654010345",
        denominazione: "PIENA S.P.A.",
        denominazioneRicerca: chiaveRicerca("PIENA S.P.A."),
        formaGiuridica: "Società per azioni",
        reaNumero: "123456",
        atecoPrimario: "41.20.00",
        providerName: "test",
        fetchedAt: new Date(),
      },
    ]);

    const trovate = await db
      .select({ denominazione: companies.denominazione })
      .from(companies)
      .where(sql`${datiSostanzialiSql} >= ${SOGLIA_INDICIZZAZIONE}`);

    const nomi = trovate.map((riga) => riga.denominazione);
    expect(nomi).toContain("PIENA S.P.A.");
    expect(nomi).not.toContain("MAGRA S.R.L.");
  });
});
