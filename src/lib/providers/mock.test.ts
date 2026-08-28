import { describe, expect, it } from "vitest";

import { MockCompanyProvider } from "./mock";

const provider = new MockCompanyProvider();

describe("inEvidenza", () => {
  it("ordina per fatturato decrescente", async () => {
    const aziende = await provider.inEvidenza(6);

    expect(aziende).toHaveLength(6);

    const fatturati = aziende.map((azienda) => azienda.fatturato ?? 0);
    expect([...fatturati].sort((a, b) => b - a)).toEqual(fatturati);
  });

  it("tiene fuori le aziende dimostrative", async () => {
    // hanno numeri inventati: in una classifica scavalcherebbero aziende vere
    const aziende = await provider.inEvidenza(20);

    expect(aziende.some((azienda) => azienda.fittizia)).toBe(false);
  });

  it("accompagna ogni fatturato con il suo anno", async () => {
    const aziende = await provider.inEvidenza(6);

    for (const azienda of aziende) {
      expect(azienda.fatturato).toBeGreaterThan(0);
      expect(azienda.anno).toBeGreaterThan(1900);
    }
  });
});

describe("campi assenti", () => {
  it("restituisce null, mai undefined", async () => {
    // Le imprese degli elenchi pubblici hanno spesso solo nome e sede. Se un
    // campo mancante arrivasse come `undefined`, i controlli `!== null` della
    // scheda lo lascerebbero passare e finirebbe stampato come "undefined".
    const magre = await provider.elenco({}, { limite: 400 });

    for (const riga of magre.risultati) {
      const esito = await provider.getByPartitaIva(riga.partitaIva);
      if (esito.status !== "found") continue;

      for (const [campo, valore] of Object.entries(esito.company)) {
        expect(valore, `${riga.partitaIva} → ${campo}`).not.toBeUndefined();
      }
    }
  });
});
