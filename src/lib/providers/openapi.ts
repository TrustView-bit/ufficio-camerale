import { z } from "zod";

import type {
  CompanyData,
  CompanyProvider,
  ProviderResult,
  StatoAttivita,
} from "./types";

/**
 * Provider openapi.it (Company API).
 *
 * ⚠️ NON ANCORA VERIFICATO CONTRO L'API REALE. Trasporto, autenticazione e
 * mappatura degli errori sono scritti con cura, ma la corrispondenza dei
 * singoli campi va confermata su una risposta vera prima di mettere
 * `COMPANY_PROVIDER=openapi` in produzione.
 *
 * Per questo lo schema è volutamente severo su ciò che serve davvero
 * (denominazione e partita IVA) e permissivo sul resto: se la forma della
 * risposta non è quella attesa il provider risponde `unavailable/UNEXPECTED`
 * e si ripiega sull'archivio, invece di mostrare dati sbagliati come se
 * fossero buoni. Un errore rumoroso è preferibile a una scheda plausibile ma
 * falsa.
 */

const OPENAPI_BASE = "https://company.openapi.com";
const TIMEOUT_MS = 8000;

/** Livelli di dettaglio offerti dall'API, dal più economico al più completo. */
export type OpenapiLevel = "IT-start" | "IT-advanced" | "IT-full";

/** Costo indicativo per interrogazione, in euro. Da allineare al listino. */
const COSTO_PER_LIVELLO: Record<OpenapiLevel, number> = {
  "IT-start": 0.05,
  "IT-advanced": 0.35,
  "IT-full": 1.2,
};

const indirizzoSchema = z
  .object({
    streetName: z.string().nullish(),
    street: z.string().nullish(),
    streetNumber: z.string().nullish(),
    toponym: z.string().nullish(),
    town: z.string().nullish(),
    province: z.string().nullish(),
    zipCode: z.string().nullish(),
    region: z.string().nullish(),
  })
  .partial()
  .passthrough();

const atecoSchema = z
  .object({
    code: z.string().nullish(),
    description: z.string().nullish(),
  })
  .partial()
  .passthrough();

const companySchema = z
  .object({
    // gli unici campi senza i quali non si può costruire una scheda
    companyName: z.string().min(1),
    vatCode: z.string().nullish(),
    taxCode: z.string().nullish(),

    legalForm: z.string().nullish(),
    activityStatus: z.string().nullish(),
    registrationDate: z.string().nullish(),
    creationDate: z.string().nullish(),

    reaCode: z.union([z.string(), z.number()]).nullish(),
    cciaa: z.string().nullish(),
    shareCapital: z.union([z.string(), z.number()]).nullish(),

    atecoClassification: z
      .object({ ateco: atecoSchema.nullish() })
      .partial()
      .passthrough()
      .nullish(),

    address: z
      .object({ registeredOffice: indirizzoSchema.nullish() })
      .partial()
      .passthrough()
      .nullish(),

    pec: z.string().nullish(),
    website: z.string().nullish(),
    phone: z.string().nullish(),
    employees: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough();

const responseSchema = z
  .object({
    success: z.boolean().nullish(),
    error: z.unknown().nullish(),
    message: z.string().nullish(),
    data: z.union([z.array(companySchema), companySchema]).nullish(),
  })
  .passthrough();

type RawCompany = z.infer<typeof companySchema>;

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed =
    typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/** Normalizza le molte diciture con cui viene indicato lo stato attività. */
export function mapStatoAttivita(raw: string | null | undefined): StatoAttivita {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("liquidazione")) return "in-liquidazione";
  if (value.includes("cessat")) return "cessata";
  // "inattiva" è uno stato a sé: iscritta ma non operativa
  if (value.includes("inattiv")) return "inattiva";
  if (value.includes("attiv")) return "attiva";
  return "sconosciuto";
}

/** Ricompone un indirizzo leggibile dai pezzi restituiti dall'API. */
function mapIndirizzo(raw: z.infer<typeof indirizzoSchema> | null | undefined) {
  if (!raw) return null;

  const via =
    toText(
      [raw.toponym, raw.streetName ?? raw.street, raw.streetNumber]
        .filter(Boolean)
        .join(" "),
    ) ?? null;

  const indirizzo = {
    via,
    cap: toText(raw.zipCode),
    comune: toText(raw.town),
    provincia: toText(raw.province),
    nazione: "IT",
  };

  // un indirizzo con soli campi vuoti non vale la pena di essere conservato
  return via || indirizzo.comune ? indirizzo : null;
}

/** Traduce una risposta openapi.it nel nostro tipo di dominio. */
export function mapOpenapiCompany(
  raw: RawCompany,
  partitaIva: string,
): CompanyData {
  const ateco = raw.atecoClassification?.ateco;

  return {
    partitaIva: toText(raw.vatCode) ?? partitaIva,
    codiceFiscale: toText(raw.taxCode),
    denominazione: raw.companyName.trim(),
    formaGiuridica: toText(raw.legalForm),
    statoAttivita: mapStatoAttivita(raw.activityStatus),
    dataCostituzione:
      toText(raw.registrationDate)?.slice(0, 10) ??
      toText(raw.creationDate)?.slice(0, 10) ??
      null,
    reaNumero: toText(raw.reaCode),
    reaCciaa: toText(raw.cciaa),
    capitaleSociale: toNumber(raw.shareCapital),
    atecoPrimario: toText(ateco?.code),
    // openapi.it non dichiara la classificazione: lo stabilisce descriviAteco
    atecoVersione: null,
    atecoPrimarioDescrizione: toText(ateco?.description),
    atecoSecondari: [],
    sede: mapIndirizzo(raw.address?.registeredOffice),
    unitaLocali: [],
    bilanci: [],
    pec: toText(raw.pec),
    sitoWeb: toText(raw.website),
    telefono: toText(raw.phone),
    dipendenti: toNumber(raw.employees),
    classeDipendenti: null,
  };
}

/** Estrae l'unica azienda attesa, che l'API la incarti in un array o no. */
export function extractCompany(data: unknown): RawCompany | null {
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) return null;

  const payload = parsed.data.data;
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] ?? null;
  return payload;
}

export class OpenapiCompanyProvider implements CompanyProvider {
  readonly name = "openapi";
  readonly costPerLookupEur: number;

  constructor(
    private readonly token: string,
    private readonly level: OpenapiLevel = "IT-start",
  ) {
    this.costPerLookupEur = COSTO_PER_LIVELLO[level];
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

    if (response.status === 404) {
      return { status: "not-found", httpStatus: 404 };
    }

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

    const raw = extractCompany(body);
    if (!raw) {
      // Nessun dato utilizzabile: o l'impresa non esiste, o la risposta non
      // ha la forma attesa. In entrambi i casi non si inventa nulla.
      const parsed = responseSchema.safeParse(body);
      const empty =
        parsed.success &&
        (parsed.data.data === null || parsed.data.data === undefined);
      return empty
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

function mapHttpStatus(status: number) {
  if (status === 401 || status === 403) return "UNAUTHORIZED" as const;
  if (status === 402) return "QUOTA_EXCEEDED" as const;
  if (status === 429) return "RATE_LIMITED" as const;
  if (status >= 500) return "SERVICE_UNAVAILABLE" as const;
  return "UNEXPECTED" as const;
}
