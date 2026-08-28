import { describe, expect, it, vi } from "vitest";

import type { CompanyData } from "@/lib/providers/types";

import { MemoryCache } from "@/lib/cache/store";

import {
  chiaveDescrizione,
  generaESalvaDescrizione,
  leggiDescrizione,
} from "./archivio";
import { fattiDi, fattiSufficienti, numeriAmmessi } from "./fatti";
import { componiDescrizione, type ClienteModello } from "./genera";
import { messaggioUtente } from "./prompt";
import { verificaDescrizione } from "./verifica";

function azienda(modifiche: Partial<CompanyData> = {}): CompanyData {
  return {
    partitaIva: "00905811006",
    codiceFiscale: "00905811006",
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
    atecoSecondari: [],
    sede: {
      via: "Largo Richini 6",
      cap: "20122",
      comune: "Milano",
      provincia: "MI",
      nazione: "IT",
    },
    coordinate: null,
    codiceSdi: null,
    unitaLocali: [],
    bilanci: [{ anno: 2024, fatturato: 18_400_000, utile: null, dipendenti: 92 }],
    pec: null,
    sitoWeb: null,
    telefono: null,
    dipendenti: 92,
    classeDipendenti: null,
    ...modifiche,
  };
}

/** Modello finto: restituisce ciò che gli si dice, senza chiamare nulla. */
function modello(risposta: string | null | Error): ClienteModello {
  return {
    modello: "modello-finto",
    scrivi: vi.fn(async () => {
      if (risposta instanceof Error) throw risposta;
      return risposta;
    }),
  };
}

const TESTO_VALIDO =
  "Esempio Manifattura S.p.A. è una società per azioni con sede a Milano (MI), " +
  "costituita il 17 aprile 1962 e attualmente attiva. Opera nei lavori di " +
  "meccanica generale e dichiara un capitale sociale di 2.500.000 euro.";

describe("fattiDi", () => {
  it("porta al modello solo ciò che la scheda contiene", () => {
    const etichette = fattiDi(azienda()).map((fatto) => fatto.etichetta);

    expect(etichette).toContain("Sede legale");
    expect(etichette).toContain("Fatturato 2024");
    // nessun campo inventato dove il dato manca
    expect(
      fattiDi(azienda({ capitaleSociale: null })).map((f) => f.etichetta),
    ).not.toContain("Capitale sociale");
  });

  it("riconosce quando i dati non bastano per scrivere nulla", () => {
    const spoglia = azienda({
      formaGiuridica: null,
      dataCostituzione: null,
      atecoPrimario: null,
      capitaleSociale: null,
      dipendenti: null,
      bilanci: [],
    });

    expect(fattiSufficienti(fattiDi(spoglia))).toBe(false);
    expect(fattiSufficienti(fattiDi(azienda()))).toBe(true);
  });
});

describe("numeriAmmessi", () => {
  it("normalizza i separatori, così 2.500.000 e 2500000 coincidono", () => {
    expect(numeriAmmessi(fattiDi(azienda()))).toContain("2500000");
  });
});

describe("verificaDescrizione", () => {
  const fatti = fattiDi(azienda());

  it("accetta un testo costruito sui dati", () => {
    expect(verificaDescrizione(TESTO_VALIDO, fatti)).toEqual({
      ok: true,
      testo: TESTO_VALIDO,
    });
  });

  it("respinge una cifra che nei dati non c'è", () => {
    const inventato = TESTO_VALIDO.replace("2.500.000", "3.700.000");
    const esito = verificaDescrizione(inventato, fatti);

    expect(esito.ok).toBe(false);
    expect(esito).toMatchObject({ motivo: expect.stringContaining("3700000") });
  });

  it("respinge un anno plausibile ma non presente", () => {
    const esito = verificaDescrizione(
      `${TESTO_VALIDO} Nel 1998 ha aperto un secondo stabilimento.`,
      fatti,
    );

    expect(esito.ok).toBe(false);
  });

  it("respinge testi troppo corti, troppo lunghi o impaginati", () => {
    expect(verificaDescrizione("Troppo poco.", fatti).ok).toBe(false);
    expect(verificaDescrizione("a".repeat(800), fatti).ok).toBe(false);
    expect(verificaDescrizione(`## Titolo\n${TESTO_VALIDO}`, fatti).ok).toBe(false);
  });
});

describe("componiDescrizione", () => {
  it("restituisce il testo verificato e il modello che l'ha scritto", async () => {
    const esito = await componiDescrizione(azienda(), modello(TESTO_VALIDO));

    expect(esito).toEqual({
      stato: "scritta",
      testo: TESTO_VALIDO,
      modello: "modello-finto",
    });
  });

  it("non chiama il modello per le aziende dimostrative", async () => {
    const cliente = modello(TESTO_VALIDO);
    const esito = await componiDescrizione(azienda({ fittizia: true }), cliente);

    expect(esito).toEqual({ stato: "saltata", motivo: "azienda dimostrativa" });
    expect(cliente.scrivi).not.toHaveBeenCalled();
  });

  it("non paga una chiamata quando i dati non bastano", async () => {
    const cliente = modello(TESTO_VALIDO);
    await componiDescrizione(
      azienda({
        formaGiuridica: null,
        dataCostituzione: null,
        atecoPrimario: null,
        capitaleSociale: null,
        dipendenti: null,
        bilanci: [],
      }),
      cliente,
    );

    expect(cliente.scrivi).not.toHaveBeenCalled();
  });

  it("scarta il testo se il modello si inventa una cifra", async () => {
    const esito = await componiDescrizione(
      azienda(),
      modello(TESTO_VALIDO.replace("92", "300").replace("2.500.000", "9.900.000")),
    );

    expect(esito.stato).toBe("respinta");
  });

  it("un guasto del modello non diventa un'eccezione", async () => {
    const esito = await componiDescrizione(azienda(), modello(new Error("503")));

    expect(esito).toEqual({ stato: "errore", motivo: "503" });
  });

  it("mette nel messaggio i fatti, e nient'altro", async () => {
    const cliente = modello(TESTO_VALIDO);
    await componiDescrizione(azienda(), cliente);

    const [, utente] = (cliente.scrivi as ReturnType<typeof vi.fn>).mock.calls[0]!;

    expect(utente).toBe(messaggioUtente(fattiDi(azienda())));
    expect(utente).toContain("Sede legale: Milano (MI)");
  });
});

describe("archivio delle descrizioni", () => {
  it("salva in cache il testo generato e lo rilegge", async () => {
    const cache = new MemoryCache();
    const cliente = modello(TESTO_VALIDO);
    const company = azienda();

    expect(
      await leggiDescrizione(company.partitaIva, { cache, db: null }),
    ).toBeNull();

    await generaESalvaDescrizione(company, { cache, db: null, cliente });

    expect(await leggiDescrizione(company.partitaIva, { cache, db: null })).toBe(
      TESTO_VALIDO,
    );
    expect(await cache.get(chiaveDescrizione(company.partitaIva))).toBe(
      TESTO_VALIDO,
    );
  });

  it("non richiama il modello per una scheda già descritta", async () => {
    const cache = new MemoryCache();
    const cliente = modello(TESTO_VALIDO);
    const company = azienda();

    await generaESalvaDescrizione(company, { cache, db: null, cliente });
    await generaESalvaDescrizione(company, { cache, db: null, cliente });

    expect(cliente.scrivi).toHaveBeenCalledTimes(1);
  });

  it("senza chiave non genera e non salva nulla", async () => {
    const cache = new MemoryCache();
    const company = azienda();

    await generaESalvaDescrizione(company, { cache, db: null, cliente: null });

    expect(
      await leggiDescrizione(company.partitaIva, { cache, db: null }),
    ).toBeNull();
  });

  it("un testo respinto non viene salvato: si riproverà", async () => {
    const cache = new MemoryCache();
    const company = azienda();
    const inventato = TESTO_VALIDO.replace("2.500.000", "9.900.000");

    await generaESalvaDescrizione(company, {
      cache,
      db: null,
      cliente: modello(inventato),
    });

    expect(
      await leggiDescrizione(company.partitaIva, { cache, db: null }),
    ).toBeNull();
  });
});
