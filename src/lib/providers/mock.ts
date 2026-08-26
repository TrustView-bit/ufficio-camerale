import impreseJson from "../../../data/imprese-sviluppo.json";
import { riconosciComuneInCoda } from "@/lib/geo";

import type { CompanyData, CompanyProvider, ProviderResult } from "./types";

/**
 * Provider finto, usato finché non c'è un contratto con un fornitore reale.
 *
 * Le Partite IVA sono numeri realmente esistenti e formalmente validi, ma i
 * dati camerali associati sono inventati: servono solo a far girare la UI.
 */
const AZIENDE: Record<string, CompanyData> = {
  "00743110157": {
    partitaIva: "00743110157",
    codiceFiscale: "00743110157",
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
    atecoSecondari: [
      {
        codice: "46.69.19",
        descrizione: "Commercio all'ingrosso di altri macchinari",
      },
    ],
    sede: {
      via: "Largo Francesco Richini 6",
      cap: "20122",
      comune: "Milano",
      provincia: "MI",
      nazione: "IT",
    },
    unitaLocali: [
      {
        denominazione: "Stabilimento di Sesto",
        indirizzo: {
          via: "Via Carlo Marx 24",
          cap: "20099",
          comune: "Sesto San Giovanni",
          provincia: "MI",
          nazione: "IT",
        },
        ateco: "25.62.00",
      },
    ],
    bilanci: [
      { anno: 2024, fatturato: 18_400_000, utile: 1_150_000, dipendenti: 92 },
      { anno: 2023, fatturato: 16_900_000, utile: 870_000, dipendenti: 88 },
    ],
    pec: "esempio.manifattura@pec.example.it",
    sitoWeb: "https://www.example.it",
    telefono: "+39 02 1234567",
    dipendenti: 92,
    classeDipendenti: "50-99",
  },

  "00488410010": {
    partitaIva: "00488410010",
    codiceFiscale: "00488410010",
    denominazione: "Esempio Servizi Digitali S.r.l.",
    formaGiuridica: "Società a responsabilità limitata",
    statoAttivita: "in-liquidazione",
    dataCostituzione: "2011-09-02",
    reaNumero: "1189003",
    reaCciaa: "TO",
    capitaleSociale: 50_000,
    atecoPrimario: "62.01.00",
    // codice ATECO 2022, come lo mandano ancora molti fornitori
    atecoVersione: "2022",
    atecoPrimarioDescrizione: "Produzione di software non connesso all'edizione",
    atecoSecondari: [],
    sede: {
      via: "Via Gaetano Negri 1",
      cap: "10121",
      comune: "Torino",
      provincia: "TO",
      nazione: "IT",
    },
    unitaLocali: [],
    bilanci: [{ anno: 2023, fatturato: 1_240_000, utile: -85_000, dipendenti: 11 }],
    pec: "esempio.servizi@pec.example.it",
    sitoWeb: null,
    telefono: null,
    dipendenti: 11,
    classeDipendenti: "10-19",
  },

  "12485671007": {
    partitaIva: "12485671007",
    codiceFiscale: "12485671007",
    denominazione: "Esempio Commercio S.n.c.",
    formaGiuridica: "Società in nome collettivo",
    statoAttivita: "cessata",
    dataCostituzione: "1998-01-23",
    reaNumero: "882014",
    reaCciaa: "RM",
    capitaleSociale: null,
    atecoPrimario: "47.11.30",
    atecoVersione: "2022",
    atecoPrimarioDescrizione: "Discount di alimentari",
    atecoSecondari: [],
    sede: {
      via: "Viale Filippo Tommaso Marinetti 221",
      cap: "00143",
      comune: "Roma",
      provincia: "RM",
      nazione: "IT",
    },
    unitaLocali: [],
    bilanci: [],
    pec: null,
    sitoWeb: null,
    telefono: null,
    dipendenti: null,
    classeDipendenti: null,
  },
};

/**
 * Imprese reali usate come dati di sviluppo, estratte da un elenco pubblico
 * con `scripts/estrai-imprese-pdf.py`.
 *
 * Di queste conosciamo soltanto denominazione, sede e partita IVA, e soltanto
 * quelli vengono esposti: attribuire a un'impresa vera un codice ATECO, un
 * capitale sociale o un numero REA inventati significherebbe pubblicare
 * informazioni false su un soggetto esistente. I campi che non abbiamo
 * restano null, e la scheda semplicemente non mostra quelle sezioni.
 */
function daElencoPubblico(): Record<string, CompanyData> {
  const mappa: Record<string, CompanyData> = {};

  for (const impresa of impreseJson.imprese) {
    const riconosciuto = riconosciComuneInCoda(impresa.sede);

    mappa[impresa.partitaIva] = {
      partitaIva: impresa.partitaIva,
      codiceFiscale: impresa.partitaIva,
      denominazione: impresa.denominazione,
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
      sede: riconosciuto
        ? {
            via: riconosciuto.via,
            cap: riconosciuto.comune.cap,
            comune: riconosciuto.comune.comune,
            provincia: riconosciuto.comune.sigla,
            nazione: "IT",
          }
        : null,
      unitaLocali: [],
      bilanci: [],
      pec: null,
      sitoWeb: null,
      telefono: null,
      dipendenti: null,
      classeDipendenti: null,
    };
  }

  return mappa;
}

/** Le tre aziende inventate hanno la precedenza: servono a provare la resa
    con tutti i campi valorizzati. */
const TUTTE: Record<string, CompanyData> = {
  ...daElencoPubblico(),
  ...AZIENDE,
};

export class MockCompanyProvider implements CompanyProvider {
  readonly name = "mock";
  readonly costPerLookupEur = 0;

  /** Ritardo artificiale, per vedere gli skeleton durante lo sviluppo. */
  constructor(private readonly delayMs = 0) {}

  async getByPartitaIva(partitaIva: string): Promise<ProviderResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    const company = TUTTE[partitaIva];
    return company
      ? { status: "found", company, raw: { mock: true } }
      : { status: "not-found" };
  }
}

/** Le Partite IVA per cui il provider di sviluppo ha dei dati. */
export const MOCK_PARTITE_IVA = Object.keys(TUTTE);
