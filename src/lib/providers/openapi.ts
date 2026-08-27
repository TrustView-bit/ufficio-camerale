import { z } from "zod";

import { normalizzaComune, titoloProprio } from "@/lib/geo";

import type {
  Bilancio,
  CompanyData,
  CompanyProvider,
  ProviderResult,
  ProviderUnavailableReason,
  StatoAttivita,
} from "./types";

/**
 * Provider openapi.it (Company API).
 *
 * ✅ Verificato su risposte reali dei livelli IT-start e IT-advanced: le
 * fixture in `__fixtures__/` sono risposte vere, non inventate.
 *
 * Due cose che la documentazione non lasciava intuire e che si vedono solo
 * guardando una risposta:
 *
 * - `streetName` **contiene già l'indirizzo completo** ("VIALE FILIPPO
 *   TOMMASO MARINETTI 221"), non il solo nome della via: comporlo di nuovo
 *   con toponimo e civico lo duplicherebbe;
 * - capitale sociale e dipendenti non sono campi dell'impresa ma
 *   dell'**ultimo bilancio**, dentro `balanceSheets.last`.
 */

const OPENAPI_BASE = "https://company.openapi.com";
const TIMEOUT_MS = 8000;

/** Livelli di dettaglio, dal più economico al più completo. */
export type OpenapiLevel = "IT-start" | "IT-advanced" | "IT-full";

const gpsSchema = z
  .object({ coordinates: z.array(z.number()).length(2) })
  .partial()
  .passthrough();

const sedeSchema = z
  .object({
    toponym: z.string().nullish(),
    street: z.string().nullish(),
    streetNumber: z.string().nullish(),
    /** Già completo: toponimo, via e civico insieme. */
    streetName: z.string().nullish(),
    town: z.string().nullish(),
    hamlet: z.string().nullish(),
    province: z.string().nullish(),
    zipCode: z.string().nullish(),
    gps: gpsSchema.nullish(),
  })
  .partial()
  .passthrough();

const vocaboloSchema = z
  .object({ code: z.string().nullish(), description: z.string().nullish() })
  .partial()
  .passthrough();

const bilancioSchema = z
  .object({
    year: z.number().nullish(),
    turnover: z.number().nullish(),
    netWorth: z.number().nullish(),
    employees: z.number().nullish(),
    shareCapital: z.number().nullish(),
  })
  .partial()
  .passthrough();

const aziendaSchema = z
  .object({
    // senza questi non si costruisce una scheda
    companyName: z.string().min(1),
    vatCode: z.string().nullish(),
    taxCode: z.string().nullish(),

    activityStatus: z.string().nullish(),
    detailedLegalForm: vocaboloSchema.nullish(),

    registrationDate: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),

    reaCode: z.union([z.string(), z.number()]).nullish(),
    cciaa: z.string().nullish(),

    atecoClassification: z
      .object({
        ateco: vocaboloSchema.nullish(),
        ateco2007: vocaboloSchema.nullish(),
      })
      .partial()
      .passthrough()
      .nullish(),

    address: z
      .object({ registeredOffice: sedeSchema.nullish() })
      .partial()
      .passthrough()
      .nullish(),

    balanceSheets: z
      .object({
        last: bilancioSchema.nullish(),
        all: z.array(bilancioSchema).nullish(),
      })
      .partial()
      .passthrough()
      .nullish(),

    pec: z.string().nullish(),
    sdiCode: z.string().nullish(),
  })
  .passthrough();

const rispostaSchema = z
  .object({
    success: z.boolean().nullish(),
    error: z.unknown().nullish(),
    message: z.string().nullish(),
    data: z.union([z.array(aziendaSchema), aziendaSchema]).nullish(),
  })
  .passthrough();

type Azienda = z.infer<typeof aziendaSchema>;

function testo(valore: string | number | null | undefined): string | null {
  if (valore === null || valore === undefined) return null;
  const pulito = String(valore).trim();
  return pulito === "" ? null : pulito;
}

/** Normalizza le molte diciture con cui viene indicato lo stato attività. */
export function mapStatoAttivita(grezzo: string | null | undefined): StatoAttivita {
  const valore = (grezzo ?? "").toLowerCase();
  if (valore.includes("liquidazione")) return "in-liquidazione";
  if (valore.includes("cessat")) return "cessata";
  // "inattiva" è uno stato a sé: iscritta ma non operativa
  if (valore.includes("inattiv")) return "inattiva";
  if (valore.includes("attiv")) return "attiva";
  return "sconosciuto";
}

/**
 * L'indirizzo. `streetName` è già completo: si usa quello, e si ricompone dai
 * pezzi solo quando manca.
 */
function mapIndirizzo(raw: z.infer<typeof sedeSchema> | null | undefined) {
  if (!raw) return null;

  const via =
    testo(raw.streetName) ??
    testo([raw.toponym, raw.street, raw.streetNumber].filter(Boolean).join(" "));

  const comuneGrezzo = testo(raw.town);
  if (!via && !comuneGrezzo) return null;

  // il fornitore scrive tutto in maiuscolo: si riporta alla forma con cui il
  // resto del sito scrive comuni e indirizzi
  const riconosciuto = comuneGrezzo
    ? normalizzaComune(comuneGrezzo, testo(raw.province))
    : null;

  return {
    via: via ? titoloProprio(via) : null,
    cap: testo(raw.zipCode) ?? riconosciuto?.cap ?? null,
    comune:
      riconosciuto?.comune ?? (comuneGrezzo ? titoloProprio(comuneGrezzo) : null),
    provincia: riconosciuto?.sigla ?? testo(raw.province),
    nazione: "IT",
  };
}

/** GPS arriva come [longitudine, latitudine], nell'ordine di GeoJSON. */
function mapCoordinate(raw: z.infer<typeof sedeSchema> | null | undefined) {
  const punti = raw?.gps?.coordinates;
  if (!punti || punti.length !== 2) return null;

  const [lon, lat] = punti as [number, number];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

function mapBilanci(raw: Azienda): Bilancio[] {
  const tutti = raw.balanceSheets?.all ?? [];

  return tutti
    .filter((bilancio) => typeof bilancio.year === "number")
    .map((bilancio) => ({
      anno: bilancio.year!,
      fatturato: bilancio.turnover ?? null,
      utile: bilancio.netWorth ?? null,
      dipendenti: bilancio.employees ?? null,
    }))
    .sort((a, b) => b.anno - a.anno);
}

/** Traduce una risposta openapi.it nel nostro tipo di dominio. */
export function mapOpenapiCompany(raw: Azienda, partitaIva: string): CompanyData {
  const sedeGrezza = raw.address?.registeredOffice;

  // il campo `ateco` è già nella classificazione 2025; `ateco2007` è quella
  // precedente, che il raccordo sa convertire
  const ateco2025 = raw.atecoClassification?.ateco;
  const atecoVecchio = raw.atecoClassification?.ateco2007;
  const codiceAteco = testo(ateco2025?.code) ?? testo(atecoVecchio?.code);

  const ultimo = raw.balanceSheets?.last;

  return {
    partitaIva: testo(raw.vatCode) ?? partitaIva,
    codiceFiscale: testo(raw.taxCode),
    denominazione: raw.companyName.trim(),
    formaGiuridica: testo(raw.detailedLegalForm?.description),
    statoAttivita: mapStatoAttivita(raw.activityStatus),
    dataCostituzione:
      testo(raw.startDate)?.slice(0, 10) ??
      testo(raw.registrationDate)?.slice(0, 10) ??
      null,
    reaNumero: testo(raw.reaCode),
    reaCciaa: testo(raw.cciaa),
    // capitale e dipendenti stanno nell'ultimo bilancio, non nell'impresa
    capitaleSociale: ultimo?.shareCapital ?? null,
    atecoPrimario: codiceAteco,
    atecoVersione: testo(ateco2025?.code) ? "2025" : atecoVecchio ? "2022" : null,
    atecoPrimarioDescrizione:
      testo(ateco2025?.description) ?? testo(atecoVecchio?.description),
    atecoSecondari: [],
    sede: mapIndirizzo(sedeGrezza),
    coordinate: mapCoordinate(sedeGrezza),
    codiceSdi: testo(raw.sdiCode),
    unitaLocali: [],
    bilanci: mapBilanci(raw),
    pec: testo(raw.pec),
    sitoWeb: null,
    telefono: null,
    dipendenti: ultimo?.employees ?? null,
    classeDipendenti: null,
  };
}

/** Estrae l'unica azienda attesa, che l'API la incarti in un array o no. */
export function extractCompany(data: unknown): Azienda | null {
  const parsed = rispostaSchema.safeParse(data);
  if (!parsed.success) return null;

  const payload = parsed.data.data;
  if (!payload) return null;
  return Array.isArray(payload) ? (payload[0] ?? null) : payload;
}

export class OpenapiCompanyProvider implements CompanyProvider {
  readonly name = "openapi";
  readonly costPerLookupEur: number;

  /**
   * Il costo va passato da fuori, dal listino vero: inventarlo qui
   * riempirebbe la colonna dei costi di cifre plausibili ma false.
   */
  constructor(
    private readonly token: string,
    private readonly level: OpenapiLevel = "IT-advanced",
    costoPerChiamata = 0,
  ) {
    this.costPerLookupEur = costoPerChiamata;
  }

  async getByPartitaIva(partitaIva: string): Promise<ProviderResult> {
    const url = `${OPENAPI_BASE}/${this.level}/${partitaIva}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      const isTimeout =
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      return { status: "unavailable", reason: isTimeout ? "TIMEOUT" : "NETWORK" };
    }

    if (response.status === 404) return { status: "not-found", httpStatus: 404 };

    if (!response.ok) {
      return {
        status: "unavailable",
        reason: mapHttpStatus(response.status),
        httpStatus: response.status,
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        status: "unavailable",
        reason: "UNEXPECTED",
        httpStatus: response.status,
      };
    }

    const parsed = rispostaSchema.safeParse(body);

    // L'API segnala anche i guasti con un HTTP 200 e `success: false` — un
    // problema di fatturazione arriva così. Trattarlo come "impresa non
    // trovata" sarebbe l'errore peggiore possibile: si direbbe all'utente che
    // un'impresa non esiste perché non siamo riusciti a pagare.
    if (parsed.success && parsed.data.success === false) {
      return {
        status: "unavailable",
        reason: motivoDalMessaggio(parsed.data.message),
        httpStatus: response.status,
      };
    }

    const raw = extractCompany(body);
    if (!raw) {
      const vuota =
        parsed.success &&
        (parsed.data.data === null ||
          parsed.data.data === undefined ||
          (Array.isArray(parsed.data.data) && parsed.data.data.length === 0));

      return vuota
        ? { status: "not-found", httpStatus: response.status }
        : {
            status: "unavailable",
            reason: "UNEXPECTED",
            httpStatus: response.status,
          };
    }

    return {
      status: "found",
      company: mapOpenapiCompany(raw, partitaIva),
      raw: body,
      httpStatus: response.status,
    };
  }
}

/**
 * Il motivo dell'indisponibilità ricavato dal messaggio, quando l'API
 * risponde 200 con `success: false`.
 */
export function motivoDalMessaggio(
  messaggio: string | null | undefined,
): ProviderUnavailableReason {
  const testo = (messaggio ?? "").toLowerCase();

  if (
    testo.includes("billing") ||
    testo.includes("credit") ||
    testo.includes("codice cliente")
  ) {
    return "QUOTA_EXCEEDED";
  }
  if (
    testo.includes("token") ||
    testo.includes("auth") ||
    testo.includes("scope")
  ) {
    return "UNAUTHORIZED";
  }
  if (testo.includes("limit") || testo.includes("too many")) return "RATE_LIMITED";

  return "UNEXPECTED";
}

function mapHttpStatus(status: number) {
  if (status === 401 || status === 403) return "UNAUTHORIZED" as const;
  if (status === 402) return "QUOTA_EXCEEDED" as const;
  if (status === 429) return "RATE_LIMITED" as const;
  if (status >= 500) return "SERVICE_UNAVAILABLE" as const;
  return "UNEXPECTED" as const;
}
