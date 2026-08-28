import impreseJson from "../../../data/imprese-sviluppo.json";
import {
  normalizzaComune,
  regioneDiSigla,
  riconosciComuneInCoda,
  riconosciComuneInTesta,
  titoloProprio,
} from "@/lib/geo";

import { punteggio } from "@/lib/ricerca";

import type {
  AziendaInEvidenza,
  Bilancio,
  CompanyData,
  CompanyProvider,
  EsitoElenco,
  EsitoRicerca,
  FiltriElenco,
  Indirizzo,
  OpzioniRicerca,
  ProviderResult,
  Raggruppamento,
  RisultatoAzienda,
  UnitaLocale,
  VoceAggregata,
} from "./types";

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
    coordinate: null,
    codiceSdi: null,
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
    coordinate: null,
    codiceSdi: null,
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
    coordinate: null,
    codiceSdi: null,
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
 * Imprese reali usate come dati di sviluppo, estratte da elenchi pubblici con
 * `scripts/estrai-imprese-pdf.py`.
 *
 * Di queste conosciamo soltanto denominazione, sede, partita IVA e — dove
 * l'elenco le riportava — le unità locali. Soltanto quelli vengono esposti:
 * attribuire a un'impresa vera un codice ATECO, un capitale sociale o un
 * numero REA inventati significherebbe pubblicare informazioni false su un
 * soggetto esistente. I campi che non abbiamo restano null, e la scheda
 * semplicemente non mostra quelle sezioni.
 */
type SedeGrezza = {
  via: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
};

/** Alcuni elenchi danno l'indirizzo già diviso, altri su una riga sola. */
function indirizzoDa(
  sede: SedeGrezza | null | undefined,
  sedeTesto: string | null | undefined,
): Indirizzo | null {
  if (sede?.comune) {
    // alcuni elenchi accodano la frazione al comune: si prova prima il nome
    // intero, poi solo la sua parte iniziale
    const riconosciuto =
      normalizzaComune(sede.comune, sede.provincia) ??
      riconosciComuneInTesta(sede.comune, sede.provincia);
    return {
      via: sede.via ? titoloProprio(sede.via) : null,
      cap: sede.cap ?? riconosciuto?.cap ?? null,
      comune: riconosciuto?.comune ?? titoloProprio(sede.comune),
      provincia: riconosciuto?.sigla ?? sede.provincia ?? null,
      nazione: "IT",
    };
  }

  if (sedeTesto) {
    const riconosciuto = riconosciComuneInCoda(sedeTesto);
    if (riconosciuto) {
      return {
        via: riconosciuto.via,
        cap: riconosciuto.comune.cap,
        comune: riconosciuto.comune.comune,
        provincia: riconosciuto.comune.sigla,
        nazione: "IT",
      };
    }
  }

  return null;
}

function daElenchiPubblici(): Record<string, CompanyData> {
  const mappa: Record<string, CompanyData> = {};

  for (const impresa of impreseJson.imprese) {
    const sede = indirizzoDa(
      "sede" in impresa ? (impresa.sede as SedeGrezza) : null,
      "sedeTesto" in impresa ? (impresa.sedeTesto as string | null) : null,
    );

    const unitaLocali: UnitaLocale[] = (impresa.unitaLocali ?? [])
      .map((unita) => indirizzoDa(unita as SedeGrezza, null))
      .filter((indirizzo): indirizzo is Indirizzo => indirizzo !== null)
      .map((indirizzo) => ({ denominazione: null, indirizzo, ateco: null }));

    // Il campo c'è solo dove l'elenco di origine lo forniva. Per le imprese
    // reali resta null: attribuire loro un capitale o un REA inventati
    // sarebbe pubblicare informazioni false su un soggetto esistente.
    // `?? null` non è pleonastico: una chiave assente dà `undefined`, che
    // supera i controlli `!== null` a valle e finisce stampato nella scheda
    // come "undefined" o "NaN €".
    const campo = <T>(chiave: string): T | null =>
      ((impresa as Record<string, unknown>)[chiave] as T | null) ?? null;

    mappa[impresa.partitaIva] = {
      partitaIva: impresa.partitaIva,
      codiceFiscale: campo<string>("codiceFiscale") ?? impresa.partitaIva,
      denominazione: impresa.denominazione,
      formaGiuridica: campo<string>("formaGiuridica"),
      statoAttivita:
        campo<CompanyData["statoAttivita"]>("statoAttivita") ?? "sconosciuto",
      // alcuni elenchi danno la data intera, altri solo l'anno
      dataCostituzione:
        campo<string>("dataCostituzione") ??
        (campo<number>("annoCostituzione")
          ? String(campo<number>("annoCostituzione"))
          : null),
      reaNumero: campo<string>("reaNumero"),
      reaCciaa: campo<string>("reaCciaa"),
      capitaleSociale: campo<number>("capitaleSociale"),
      atecoPrimario: campo<string>("atecoPrimario"),
      atecoVersione: campo<CompanyData["atecoVersione"]>("atecoVersione"),
      atecoPrimarioDescrizione: null,
      atecoSecondari: [],
      sede,
      coordinate: null,
      codiceSdi: null,
      unitaLocali,
      bilanci: campo<Bilancio[]>("bilanci") ?? [],
      pec: campo<string>("pec"),
      sitoWeb: campo<string>("sitoWeb"),
      telefono: campo<string>("telefono"),
      dipendenti: campo<number>("dipendenti"),
      classeDipendenti: null,
      fittizia: campo<boolean>("fittizia") ?? false,
    };
  }

  return mappa;
}

/** Le tre aziende inventate hanno la precedenza: servono a provare la resa
    con tutti i campi valorizzati. */
const TUTTE: Record<string, CompanyData> = {
  ...daElenchiPubblici(),
  ...AZIENDE,
};

function inSintesi(azienda: CompanyData): RisultatoAzienda {
  return {
    partitaIva: azienda.partitaIva,
    denominazione: azienda.denominazione,
    comune: azienda.sede?.comune ?? null,
    provincia: azienda.sede?.provincia ?? null,
    statoAttivita: azienda.statoAttivita,
    fittizia: azienda.fittizia,
  };
}

/** Applica i filtri territoriali e settoriali a un elenco di aziende. */
function filtra(aziende: CompanyData[], filtri: FiltriElenco): CompanyData[] {
  return aziende.filter((azienda) => {
    const sigla = azienda.sede?.provincia ?? null;

    if (filtri.provincia && sigla !== filtri.provincia) return false;
    if (filtri.comune && azienda.sede?.comune !== filtri.comune) return false;
    if (filtri.regione && (!sigla || regioneDiSigla(sigla) !== filtri.regione)) {
      return false;
    }
    // il codice ATECO si confronta per prefisso: "62" prende tutta la divisione
    if (filtri.ateco && !azienda.atecoPrimario?.startsWith(filtri.ateco)) {
      return false;
    }

    if (filtri.iniziale) {
      const prima = azienda.denominazione.trim().charAt(0).toUpperCase();
      const eLettera = /[A-Z]/.test(prima);
      // "#" raccoglie tutto ciò che non comincia per lettera
      if (filtri.iniziale === "#" ? eLettera : prima !== filtri.iniziale) {
        return false;
      }
    }

    return true;
  });
}

/** L'esercizio più recente di cui si conosce il fatturato. */
function ultimoConFatturato(azienda: CompanyData): Bilancio | null {
  return (
    azienda.bilanci
      .filter((bilancio) => bilancio.fatturato !== null)
      .sort((a, b) => b.anno - a.anno)[0] ?? null
  );
}

const perDenominazione = (a: CompanyData, b: CompanyData) =>
  a.denominazione.localeCompare(b.denominazione, "it");

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

  /**
   * Ricerca per ragione sociale sulle imprese caricate in memoria.
   *
   * Con la query vuota restituisce tutto in ordine alfabetico: la pagina di
   * ricerca diventa così anche un elenco navigabile.
   */
  async cercaPerNome(
    query: string,
    opzioni: OpzioniRicerca = {},
  ): Promise<EsitoRicerca> {
    const { provincia, offset = 0, limite = 20 } = opzioni;
    const termine = query.trim();

    let trovate = Object.values(TUTTE);

    if (termine) {
      trovate = trovate
        .map((azienda) => ({
          azienda,
          punti: punteggio(azienda.denominazione, termine),
        }))
        .filter((riga) => riga.punti > 0)
        .sort(
          (a, b) =>
            b.punti - a.punti ||
            a.azienda.denominazione.localeCompare(b.azienda.denominazione, "it"),
        )
        .map((riga) => riga.azienda);
    } else {
      trovate = [...trovate].sort((a, b) =>
        a.denominazione.localeCompare(b.denominazione, "it"),
      );
    }

    // le province si contano prima di filtrare, altrimenti il filtro
    // nasconderebbe le alternative fra cui scegliere
    const conteggio = new Map<string, number>();
    for (const azienda of trovate) {
      const sigla = azienda.sede?.provincia;
      if (sigla) conteggio.set(sigla, (conteggio.get(sigla) ?? 0) + 1);
    }

    if (provincia) {
      trovate = trovate.filter((azienda) => azienda.sede?.provincia === provincia);
    }

    const risultati: RisultatoAzienda[] = trovate
      .slice(offset, offset + limite)
      .map((azienda) => ({
        partitaIva: azienda.partitaIva,
        denominazione: azienda.denominazione,
        comune: azienda.sede?.comune ?? null,
        provincia: azienda.sede?.provincia ?? null,
        statoAttivita: azienda.statoAttivita,
      }));

    return {
      totale: trovate.length,
      risultati,
      province: [...conteggio.entries()]
        .map(([sigla, quante]) => ({ sigla, quante }))
        .sort((a, b) => b.quante - a.quante || a.sigla.localeCompare(b.sigla)),
    };
  }

  async elenco(
    filtri: FiltriElenco,
    opzioni: OpzioniRicerca = {},
  ): Promise<EsitoElenco> {
    const { offset = 0, limite = 24 } = opzioni;
    const trovate = filtra(Object.values(TUTTE), filtri).sort(perDenominazione);

    return {
      totale: trovate.length,
      risultati: trovate.slice(offset, offset + limite).map(inSintesi),
    };
  }

  async inEvidenza(limite = 6): Promise<AziendaInEvidenza[]> {
    return (
      Object.values(TUTTE)
        // le dimostrative hanno numeri inventati: in una classifica per
        // fatturato scavalcherebbero aziende vere con cifre finte
        .filter((azienda) => !azienda.fittizia)
        .map((azienda) => ({ azienda, bilancio: ultimoConFatturato(azienda) }))
        .filter(
          (voce): voce is { azienda: CompanyData; bilancio: Bilancio } =>
            voce.bilancio !== null,
        )
        .sort((a, b) => b.bilancio.fatturato! - a.bilancio.fatturato!)
        .slice(0, limite)
        .map(({ azienda, bilancio }) => ({
          ...inSintesi(azienda),
          fatturato: bilancio.fatturato,
          anno: bilancio.anno,
        }))
    );
  }

  async aggrega(
    filtri: FiltriElenco,
    per: Raggruppamento,
  ): Promise<VoceAggregata[]> {
    const conteggio = new Map<string, number>();

    for (const azienda of filtra(Object.values(TUTTE), filtri)) {
      const sigla = azienda.sede?.provincia ?? null;

      const primaLettera = azienda.denominazione.trim().charAt(0).toUpperCase();

      const chiave =
        per === "provincia"
          ? sigla
          : per === "comune"
            ? (azienda.sede?.comune ?? null)
            : per === "regione"
              ? (sigla && regioneDiSigla(sigla)) || null
              : per === "iniziale"
                ? /[A-Z]/.test(primaLettera)
                  ? primaLettera
                  : "#"
                : // per settore si raggruppa sulla divisione, non sul codice
                  // completo: altrimenti si otterrebbero centinaia di voci da una
                  (azienda.atecoPrimario?.slice(0, 2) ?? null);

      if (chiave) conteggio.set(chiave, (conteggio.get(chiave) ?? 0) + 1);
    }

    return [...conteggio.entries()]
      .map(([chiave, quante]) => ({ chiave, quante }))
      .sort(
        (a, b) => b.quante - a.quante || a.chiave.localeCompare(b.chiave, "it"),
      );
  }
}

/** Le Partite IVA per cui il provider di sviluppo ha dei dati. */
export const MOCK_PARTITE_IVA = Object.keys(TUTTE);
