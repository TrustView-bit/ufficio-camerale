import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/db";
import { richiesteDocumenti } from "@/lib/db/schema";

import { salvaRichiesta } from "./archivio";
import { richiestaSchema } from "./schema";

const MIGRAZIONI = fileURLToPath(new URL("../../../drizzle", import.meta.url));

async function makeDb() {
  const client = new PGlite();
  for (const nome of readdirSync(MIGRAZIONI)
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(`${MIGRAZIONI}/${nome}`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement.trim());
    }
  }
  return drizzle(client) as unknown as Database;
}

const VALIDA = {
  partitaIva: "00743110157",
  denominazione: "Esempio Manifattura S.p.A.",
  documentoId: "visura-ordinaria",
  nome: "Mario Rossi",
  email: "mario@example.it",
  telefono: "",
  note: "  ",
  consenso: true as const,
};

describe("richiestaSchema", () => {
  it("accetta una richiesta completa e svuota i facoltativi lasciati in bianco", () => {
    const esito = richiestaSchema.safeParse(VALIDA);
    expect(esito.success).toBe(true);
    if (esito.success) {
      expect(esito.data.telefono).toBeNull();
      expect(esito.data.note).toBeNull();
    }
  });

  it("rifiuta senza consenso, senza email valida, con documento fuori catalogo", () => {
    expect(richiestaSchema.safeParse({ ...VALIDA, consenso: false }).success).toBe(false);
    expect(richiestaSchema.safeParse({ ...VALIDA, email: "mario" }).success).toBe(false);
    expect(
      richiestaSchema.safeParse({ ...VALIDA, documentoId: "inventato" }).success,
    ).toBe(false);
    expect(
      richiestaSchema.safeParse({ ...VALIDA, partitaIva: "00743110158" }).success,
    ).toBe(false);
  });
});

describe("salvaRichiesta", () => {
  it("scrive la riga copiando nome e prezzo del documento dal catalogo", async () => {
    const db = await makeDb();
    const richiesta = richiestaSchema.parse(VALIDA);

    const esito = await salvaRichiesta(db, richiesta);
    expect(esito).toEqual({ ok: true, id: 1 });

    const [riga] = await db.select().from(richiesteDocumenti);
    expect(riga?.documentoNome).toBe("Visura camerale ordinaria");
    expect(riga?.prezzoIndicativo).toBe("7.80");
    expect(riga?.stato).toBe("ricevuta");
    expect(riga?.email).toBe("mario@example.it");
    // PGlite ci mette qualche secondo ad avviarsi quando la suite gira in parallelo
  }, 30_000);

  it("senza archivio lo dice invece di fingere di aver salvato", async () => {
    const esito = await salvaRichiesta(null, richiestaSchema.parse(VALIDA));
    expect(esito).toEqual({ ok: false, motivo: "archivio-assente" });
  });
});
