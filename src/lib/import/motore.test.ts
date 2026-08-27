import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";

import { companies, impresaFonti } from "@/lib/db/schema";

import { applicaBlocco, deveSostituire, inColonne } from "./motore";
import { validaRiga, type ImpresaImport } from "./schema";
import type { Database } from "@/lib/companies/repository";

const MIGRAZIONI = fileURLToPath(new URL("../../../drizzle", import.meta.url));

/** Postgres vero in memoria, con tutte le migrazioni applicate in ordine. */
async function makeDb(): Promise<Database> {
  const client = new PGlite();
  const db = drizzle(client);

  for (const file of readdirSync(MIGRAZIONI)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(`${MIGRAZIONI}/${file}`, "utf8");
    for (const istruzione of sql.split("--> statement-breakpoint")) {
      const pulita = istruzione.trim();
      if (pulita) await client.exec(pulita);
    }
  }

  return db as unknown as Database;
}

function impresa(campi: Record<string, unknown>): ImpresaImport {
  const esito = validaRiga({
    partitaIva: "00743110157",
    denominazione: "Esempio S.r.l.",
    fonte: "telemaco-indirizzi",
    dataAcquisizione: "2026-01-01T00:00:00.000Z",
    ...campi,
  });
  if (!esito.ok) throw new Error(`fixture non valida: ${esito.motivo}`);
  return esito.impresa;
}

describe("deveSostituire", () => {
  const vecchia = {
    fonte: "rna-xml",
    priorita: 30,
    acquisitoIl: new Date("2026-01-01"),
  };

  it("non cancella mai un dato con un valore vuoto", () => {
    expect(
      deveSostituire(null, "Esempio", { ...vecchia, priorita: 100 }, vecchia),
    ).toBe(false);
    expect(
      deveSostituire("", "Esempio", { ...vecchia, priorita: 100 }, vecchia),
    ).toBe(false);
  });

  it("riempie sempre un campo vuoto", () => {
    expect(
      deveSostituire("Esempio", null, { ...vecchia, priorita: 1 }, vecchia),
    ).toBe(true);
  });

  it("fa vincere la fonte con priorità più alta", () => {
    const migliore = {
      fonte: "openapi",
      priorita: 100,
      acquisitoIl: new Date("2020-01-01"),
    };
    expect(deveSostituire("Nuovo", "Vecchio", migliore, vecchia)).toBe(true);
  });

  it("non lascia che una fonte peggiore sovrascriva una migliore", () => {
    const peggiore = {
      fonte: "rna-xml",
      priorita: 10,
      acquisitoIl: new Date("2030-01-01"),
    };
    const migliore = {
      fonte: "openapi",
      priorita: 100,
      acquisitoIl: new Date("2020-01-01"),
    };
    expect(deveSostituire("Nuovo", "Vecchio", peggiore, migliore)).toBe(false);
  });

  it("a parità di priorità vince il dato più recente", () => {
    const recente = { ...vecchia, acquisitoIl: new Date("2026-06-01") };
    expect(deveSostituire("Nuovo", "Vecchio", recente, vecchia)).toBe(true);
    expect(deveSostituire("Nuovo", "Vecchio", vecchia, recente)).toBe(false);
  });
});

describe("inColonne", () => {
  it("normalizza comune, provincia e CAP", () => {
    const colonne = inColonne(
      impresa({
        indirizzo: {
          via: "VIA ROMA",
          civico: "1",
          comune: "MILANO",
          provincia: "MI",
        },
      }),
    );

    expect(colonne.sede).toMatchObject({ comune: "Milano", provincia: "MI" });
  });

  it("risolve la descrizione ATECO sui dati Istat", () => {
    const colonne = inColonne(
      impresa({
        ateco: { codice: "62.01.00", versione: "2022", descrizione: "altro" },
      }),
    );

    expect(colonne.atecoPrimario).toBe("62.01.00");
    expect(colonne.atecoVersione).toBe("2022");
    expect(colonne.atecoPrimarioDescrizione).toBe(
      "Attività di programmazione informatica",
    );
  });

  it("divide il REA in camera e numero", () => {
    expect(inColonne(impresa({ rea: "MI-1305487" }))).toMatchObject({
      reaCciaa: "MI",
      reaNumero: "1305487",
    });
  });
});

describe("applicaBlocco", () => {
  let db: Database;
  beforeEach(async () => {
    db = await makeDb();
  });

  it("inserisce un'impresa nuova", async () => {
    const esito = await applicaBlocco(db, [impresa({})]);

    expect(esito).toMatchObject({ inserita: 1, aggiornata: 0, invariata: 0 });
    expect(await db.select().from(companies)).toHaveLength(1);
  });

  it("reimportare lo stesso file non cambia nulla", async () => {
    const righe = [impresa({ formaGiuridica: "S.r.l." })];

    await applicaBlocco(db, righe);
    const dopoPrima = (await db.select().from(companies))[0]!;

    const secondo = await applicaBlocco(db, righe);

    expect(secondo).toMatchObject({ inserita: 0, aggiornata: 0, invariata: 1 });

    const dopoSeconda = (await db.select().from(companies))[0]!;
    expect(dopoSeconda.updatedAt.getTime()).toBe(dopoPrima.updatedAt.getTime());
    expect(await db.select().from(companies)).toHaveLength(1);
  });

  it("una fonte povera non cancella i campi di una ricca", async () => {
    await applicaBlocco(db, [
      impresa({
        fonte: "telemaco-esteso",
        formaGiuridica: "Società per azioni",
        capitaleSociale: 100000,
      }),
    ]);

    // RNA conosce solo denominazione e codice fiscale
    await applicaBlocco(db, [
      impresa({ fonte: "rna-xml", denominazione: "ESEMPIO SRL" }),
    ]);

    const riga = (await db.select().from(companies))[0]!;
    expect(riga.formaGiuridica).toBe("Società per azioni");
    expect(riga.capitaleSociale).toBe("100000.00");
    // e nemmeno la denominazione, perché la fonte è meno affidabile
    expect(riga.denominazione).toBe("Esempio S.r.l.");
  });

  it("una fonte più affidabile corregge il dato", async () => {
    await applicaBlocco(db, [
      impresa({ fonte: "rna-xml", denominazione: "ESEMPIO SRL" }),
    ]);
    await applicaBlocco(db, [
      impresa({ fonte: "openapi", denominazione: "Esempio S.r.l." }),
    ]);

    expect((await db.select().from(companies))[0]!.denominazione).toBe(
      "Esempio S.r.l.",
    );
  });

  it("registra da quale fonte viene ciascun campo", async () => {
    await applicaBlocco(db, [
      impresa({ fonte: "telemaco-esteso", formaGiuridica: "S.r.l." }),
    ]);

    const fonti = await db.select().from(impresaFonti);
    const perCampo = new Map(fonti.map((riga) => [riga.campo, riga.fonte]));

    expect(perCampo.get("denominazione")).toBe("telemaco-esteso");
    expect(perCampo.get("formaGiuridica")).toBe("telemaco-esteso");
  });

  it("fonde più imprese in un blocco solo", async () => {
    const esito = await applicaBlocco(db, [
      impresa({ partitaIva: "00743110157" }),
      impresa({ partitaIva: "00488410010", denominazione: "Altra S.p.A." }),
    ]);

    expect(esito.inserita).toBe(2);
    expect(await db.select().from(companies)).toHaveLength(2);
  });
});
