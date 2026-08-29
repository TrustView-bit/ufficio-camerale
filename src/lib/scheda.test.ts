import { describe, expect, it } from "vitest";

import type { CompanyData } from "@/lib/providers/types";

import { datiSostanziali, schedaIndicizzabile } from "./scheda";

function azienda(modifiche: Partial<CompanyData> = {}): CompanyData {
  return {
    partitaIva: "01790820623",
    codiceFiscale: "01790820623",
    denominazione: "A.D.R. Costruzioni Sannite S.r.l.",
    formaGiuridica: null,
    statoAttivita: "sconosciuto",
    dataCostituzione: null,
    reaNumero: null,
    reaCciaa: null,
    capitaleSociale: null,
    atecoPrimario: null,
    atecoVersione: null,
    atecoPrimarioDescrizione: null,
    atecoSecondari: [],
    sede: {
      via: "Viale Aurora 34/C",
      cap: "82037",
      comune: "Telese Terme",
      provincia: "BN",
      nazione: "IT",
    },
    coordinate: null,
    codiceSdi: null,
    unitaLocali: [],
    bilanci: [],
    pec: null,
    sitoWeb: null,
    telefono: null,
    dipendenti: null,
    classeDipendenti: null,
    ...modifiche,
  };
}

describe("datiSostanziali", () => {
  it("non conta la sede: ce l'hanno tutte", () => {
    expect(datiSostanziali(azienda())).toBe(0);
  });

  it("conta zero dipendenti come un dato, non come un'assenza", () => {
    expect(datiSostanziali(azienda({ dipendenti: 0 }))).toBe(1);
  });
});

describe("schedaIndicizzabile", () => {
  it("tiene fuori dall'indice una scheda con il solo nome e l'indirizzo", () => {
    expect(schedaIndicizzabile(azienda())).toBe(false);
  });

  it("ammette una scheda con qualcosa da dire", () => {
    const piena = azienda({
      formaGiuridica: "Società a responsabilità limitata",
      atecoPrimario: "41.20.00",
      reaNumero: "123456",
    });

    expect(schedaIndicizzabile(piena)).toBe(true);
  });

  it("non indicizza mai un'azienda dimostrativa, per quanto completa", () => {
    const finta = azienda({
      fittizia: true,
      formaGiuridica: "S.p.A.",
      atecoPrimario: "41.20.00",
      reaNumero: "123456",
      capitaleSociale: 100_000,
    });

    expect(schedaIndicizzabile(finta)).toBe(false);
  });
});
