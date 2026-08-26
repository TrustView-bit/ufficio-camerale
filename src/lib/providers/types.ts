import type { VersioneAteco } from "@/lib/ateco";
import type { Ateco, Bilancio, Indirizzo, UnitaLocale } from "@/lib/db/schema";

export type { Ateco, Bilancio, Indirizzo, UnitaLocale, VersioneAteco };

/** Stato attività di un'impresa nel Registro Imprese. */
export const STATI_ATTIVITA = [
  "attiva",
  /** Iscritta ma non operativa: non è la stessa cosa di cessata. */
  "inattiva",
  "in-liquidazione",
  "cessata",
  "sconosciuto",
] as const;

export type StatoAttivita = (typeof STATI_ATTIVITA)[number];

/** Dati camerali di un'impresa, normalizzati e indipendenti dal fornitore. */
export type CompanyData = {
  partitaIva: string;
  codiceFiscale: string | null;
  denominazione: string;
  formaGiuridica: string | null;
  statoAttivita: StatoAttivita;
  /** ISO YYYY-MM-DD */
  dataCostituzione: string | null;
  reaNumero: string | null;
  reaCciaa: string | null;
  capitaleSociale: number | null;
  /** Codice grezzo del fornitore, mai riscritto. */
  atecoPrimario: string | null;
  /** In quale classificazione è espresso `atecoPrimario`. */
  atecoVersione: VersioneAteco | null;
  /** Descrizione risolta sui dataset Istat. */
  atecoPrimarioDescrizione: string | null;
  atecoSecondari: Ateco[];
  sede: Indirizzo | null;
  unitaLocali: UnitaLocale[];
  bilanci: Bilancio[];
  pec: string | null;
  sitoWeb: string | null;
  telefono: string | null;
  dipendenti: number | null;
  classeDipendenti: string | null;
  /**
   * true per le aziende di un dataset dimostrativo: nomi, recapiti e numeri
   * sono inventati. La scheda lo dichiara in modo visibile, perché una
   * scheda finta indistinguibile da una vera sarebbe una informazione falsa.
   */
  fittizia?: boolean;
};

export type ProviderUnavailableReason =
  | "TIMEOUT"
  | "NETWORK"
  | "UNAUTHORIZED"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "UNEXPECTED";

/**
 * Esito di un'interrogazione. Come per VIES, un provider non deve lanciare:
 * l'indisponibilità è uno stato previsto, e va tenuta distinta da "l'impresa
 * non esiste", perché porta a comportamenti diversi (ripiego sull'archivio
 * contro risposta negativa all'utente).
 */
export type ProviderResult =
  | { status: "found"; company: CompanyData; raw: unknown; httpStatus?: number }
  | { status: "not-found"; httpStatus?: number }
  | {
      status: "unavailable";
      reason: ProviderUnavailableReason;
      httpStatus?: number;
    };

/** Riga di un elenco di risultati: quel poco che serve a decidere se aprire. */
export type RisultatoAzienda = {
  partitaIva: string;
  denominazione: string;
  comune: string | null;
  provincia: string | null;
  statoAttivita: StatoAttivita;
};

export type EsitoRicerca = {
  /** Quanti risultati esistono in tutto, non quanti ne sono stati restituiti. */
  totale: number;
  risultati: RisultatoAzienda[];
  /** Le province presenti fra i risultati, per costruire il filtro. */
  province: { sigla: string; quante: number }[];
};

export type OpzioniRicerca = {
  provincia?: string;
  offset?: number;
  limite?: number;
};

/**
 * Contratto comune a tutti i fornitori di dati camerali.
 *
 * La UI dipende solo da questa interfaccia: cambiare fornitore non deve
 * comportare modifiche alle pagine.
 */
export interface CompanyProvider {
  /** Identificativo usato nei log e nella colonna provider_name. */
  readonly name: string;
  /** Costo stimato di una singola interrogazione, in euro. */
  readonly costPerLookupEur: number;

  getByPartitaIva(partitaIva: string): Promise<ProviderResult>;

  /**
   * Ricerca per ragione sociale. Facoltativa: non tutti i fornitori la
   * offrono, e chi non la offre semplicemente non la implementa. La pagina di
   * ricerca lo rileva e lo dice all'utente, invece di mostrare zero risultati
   * come se non esistesse nulla.
   */
  cercaPerNome?(query: string, opzioni?: OpzioniRicerca): Promise<EsitoRicerca>;
}

export const PROVIDER_UNAVAILABLE_MESSAGE: Record<
  ProviderUnavailableReason,
  string
> = {
  TIMEOUT: "Il fornitore dei dati camerali non ha risposto in tempo.",
  NETWORK: "Non è stato possibile raggiungere il fornitore dei dati camerali.",
  UNAUTHORIZED: "Le credenziali del fornitore dei dati camerali non sono valide.",
  QUOTA_EXCEEDED: "Il credito disponibile presso il fornitore è esaurito.",
  RATE_LIMITED: "Troppe richieste al fornitore: riprova fra poco.",
  SERVICE_UNAVAILABLE:
    "Il fornitore dei dati camerali è temporaneamente fuori servizio.",
  UNEXPECTED: "Il fornitore ha risposto in un modo che non sappiamo interpretare.",
};
