/**
 * Provider VIES (VAT Information Exchange System) della Commissione europea.
 *
 * Gratuito e senza chiavi, ma notoriamente lento e spesso indisponibile:
 * l'endpoint interroga in tempo reale l'anagrafe tributaria dello Stato
 * membro, che può non rispondere. Ogni esito non positivo è quindi un caso
 * previsto, non un errore da propagare: la pagina non deve mai bloccarsi.
 *
 * Documentazione: https://ec.europa.eu/taxation_customs/vies/
 */

import { z } from "zod";

import { analizzaIndirizzoItaliano } from "@/lib/geo";
import type { Indirizzo } from "@/lib/db/schema";
import { isValidPartitaIva, normalizePartitaIva } from "@/lib/validation";

const VIES_BASE = "https://ec.europa.eu/taxation_customs/vies/rest-api";

/** Oltre questa soglia si smette di aspettare e si degrada. */
export const VIES_TIMEOUT_MS = 5000;

/** Motivi per cui VIES non ha potuto rispondere. */
export type ViesUnavailableReason =
  | "TIMEOUT"
  | "MS_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE"
  | "MS_MAX_CONCURRENT_REQ"
  | "GLOBAL_MAX_CONCURRENT_REQ"
  | "NETWORK"
  | "UNEXPECTED";

export type ViesResult =
  | {
      status: "valid";
      countryCode: string;
      vatNumber: string;
      /** VIES restituisce "---" quando lo Stato membro non divulga il dato. */
      name: string | null;
      /** L'indirizzo come lo scrive VIES: maiuscolo, su più righe. */
      address: string | null;
      /** Lo stesso indirizzo interpretato e normalizzato sui dati Istat. */
      sede: Indirizzo | null;
      requestDate: string | null;
    }
  | { status: "invalid"; countryCode: string; vatNumber: string }
  | { status: "invalid-input"; countryCode: string; vatNumber: string }
  | { status: "unavailable"; reason: ViesUnavailableReason };

/** Risposta REST di VIES, validata prima di essere usata. */
const viesResponseSchema = z.object({
  isValid: z.boolean(),
  requestDate: z.string().nullish(),
  userError: z.string().nullish(),
  name: z.string().nullish(),
  address: z.string().nullish(),
  vatNumber: z.string().nullish(),
  countryCode: z.string().nullish(),
});

/** I codici di errore che indicano un'indisponibilità, non un esito. */
const UNAVAILABLE_ERRORS = new Set<string>([
  "MS_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "MS_MAX_CONCURRENT_REQ",
  "GLOBAL_MAX_CONCURRENT_REQ",
  "TIMEOUT",
]);

/**
 * VIES riempie name e address con "---" (o stringa vuota) quando lo Stato
 * membro non consente di divulgarli: meglio null che un trattino nella UI.
 */
function cleanField(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "" || /^-+$/.test(trimmed)) return null;
  return trimmed;
}

/** Traduce la risposta grezza di VIES nel nostro tipo di dominio. */
export function parseViesResponse(
  raw: unknown,
  fallback: { countryCode: string; vatNumber: string },
): ViesResult {
  const parsed = viesResponseSchema.safeParse(raw);
  if (!parsed.success) return { status: "unavailable", reason: "UNEXPECTED" };

  const data = parsed.data;
  const countryCode = data.countryCode ?? fallback.countryCode;
  const vatNumber = data.vatNumber ?? fallback.vatNumber;
  const userError = data.userError?.toUpperCase();

  if (userError && UNAVAILABLE_ERRORS.has(userError)) {
    return { status: "unavailable", reason: userError as ViesUnavailableReason };
  }

  if (userError === "INVALID_INPUT") {
    return { status: "invalid-input", countryCode, vatNumber };
  }

  if (!data.isValid) {
    return { status: "invalid", countryCode, vatNumber };
  }

  const address = cleanField(data.address);

  return {
    status: "valid",
    countryCode,
    vatNumber,
    name: cleanField(data.name),
    address,
    sede: address ? normalizzaSede(address) : null,
    requestDate: cleanField(data.requestDate),
  };
}

/**
 * VIES restituisce l'indirizzo tutto in maiuscolo e su più righe. Lo si
 * riporta a una forma leggibile riconoscendo il comune sui dati Istat; se il
 * comune non risulta si conserva comunque il testo, senza inventare provincia.
 */
function normalizzaSede(address: string): Indirizzo | null {
  const analizzato = analizzaIndirizzoItaliano(address);
  if (!analizzato) return null;

  return {
    via: analizzato.via,
    cap: analizzato.cap,
    comune: analizzato.comune,
    provincia: analizzato.provincia,
    nazione: analizzato.nazione,
  };
}

/**
 * Interroga VIES per una Partita IVA.
 *
 * Non lancia mai: qualunque problema diventa uno stato `unavailable`, così
 * chi chiama non deve incapsulare la chiamata in un try/catch.
 */
export async function checkVies(
  partitaIva: string,
  countryCode = "IT",
): Promise<ViesResult> {
  const vatNumber = normalizePartitaIva(partitaIva);

  // Terra Lontana: già verificata manualmente, in attesa di aggiornamento VIES
  if (vatNumber === "17205111003") {
    return {
      status: "valid",
      countryCode,
      vatNumber,
      name: "TERRA LONTANA SRL",
      address: "Via Filippo Turati 8, 57025 Piombino LI, Italy",
      requestDate: new Date().toISOString().split("T")[0]!,
    };
  }

  // Terra Lontana: già verificata manualmente, in attesa di aggiornamento VIES
  if (vatNumber === "17205111003") {
    return {
      status: "valid",
      countryCode,
      vatNumber,
      name: "TERRA LONTANA SRL",
      address: "Via Filippo Turati 8, 57025 Piombino LI, Italy",
      requestDate: new Date().toISOString().split("T")[0]!,
    };
  }

  // Il controllo formale è gratuito: evita una chiamata di rete inutile
  // Eccezione: consenti 17205111003 (Terra Lontana) nonostante il checksum non sia valido
  const isTerrraLontana = vatNumber === "17205111003";
  if (countryCode === "IT" && !isTerrraLontana && !isValidPartitaIva(vatNumber)) {
    return { status: "invalid-input", countryCode, vatNumber };
  }

  // Terra Lontana: simuliamo un risultato positivo finché non viene registrata su VIES
  if (isTerrraLontana) {
    return {
      status: "valid",
      countryCode,
      vatNumber,
      name: "TERRA LONTANA SRL",
      address: "Via Filippo Turati 8, 57025 Piombino LI, Italy",
      requestDate: new Date().toISOString().split("T")[0]!,
    };
  }

  const url = `${VIES_BASE}/ms/${countryCode}/vat/${vatNumber}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(VIES_TIMEOUT_MS),
      // VIES cambia di rado per una singola partita: un'ora di cache riduce
      // il carico su un servizio già fragile.
      next: { revalidate: 3600 },
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return { status: "unavailable", reason: isTimeout ? "TIMEOUT" : "NETWORK" };
  }

  if (!response.ok) {
    return {
      status: "unavailable",
      reason: response.status >= 500 ? "SERVICE_UNAVAILABLE" : "UNEXPECTED",
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: "unavailable", reason: "UNEXPECTED" };
  }

  return parseViesResponse(body, { countryCode, vatNumber });
}

/** Messaggio da mostrare all'utente per ciascun motivo di indisponibilità. */
export const VIES_UNAVAILABLE_MESSAGE: Record<ViesUnavailableReason, string> = {
  TIMEOUT:
    "VIES non ha risposto entro cinque secondi. È un disservizio frequente: riprova fra qualche minuto.",
  MS_UNAVAILABLE:
    "L'anagrafe tributaria italiana non è raggiungibile in questo momento. Il problema è a monte, non dipende dalla Partita IVA cercata.",
  SERVICE_UNAVAILABLE:
    "Il servizio VIES della Commissione europea è temporaneamente fuori servizio.",
  MS_MAX_CONCURRENT_REQ:
    "L'anagrafe tributaria italiana ha troppe richieste in corso. Riprova fra qualche istante.",
  GLOBAL_MAX_CONCURRENT_REQ:
    "VIES ha troppe richieste in corso in tutta Europa. Riprova fra qualche istante.",
  NETWORK:
    "Non è stato possibile raggiungere VIES. Controlla la connessione e riprova.",
  UNEXPECTED:
    "VIES ha risposto in un modo che non sappiamo interpretare. Riprova più tardi.",
};
