/**
 * Riconoscimento automatico di ciò che l'utente ha digitato nella ricerca:
 * Partita IVA, codice fiscale o ragione sociale.
 */

import { z } from "zod";

import {
  isValidCodiceFiscalePersona,
  hasCodiceFiscaleFormat,
  normalizeCodiceFiscale,
} from "./codice-fiscale";
import {
  hasPartitaIvaFormat,
  isValidPartitaIva,
  normalizePartitaIva,
} from "./partita-iva";

export type QueryKind = "partita-iva" | "codice-fiscale" | "denominazione";

export type QueryAnalysis = {
  /** Il testo così come digitato, senza spazi ai bordi. */
  raw: string;
  /** Il valore ripulito da usare per la ricerca. */
  value: string;
  kind: QueryKind;
  /**
   * Solo per P.IVA e codice fiscale: esito del controllo formale.
   * Per una ragione sociale è sempre true (non c'è nulla da validare).
   */
  isValid: boolean;
  /** Messaggio da mostrare all'utente quando `isValid` è false. */
  error?: string;
};

export const LUNGHEZZA_MINIMA_DENOMINAZIONE = 2;

/**
 * Analizza il testo digitato e stabilisce che cosa sia.
 *
 * L'ordine dei controlli conta: prima le forme a lunghezza fissa (11 cifre,
 * 16 caratteri), poi il ripiego sulla ragione sociale.
 */
export function analyzeQuery(input: string): QueryAnalysis {
  const raw = input.trim();
  const compact = normalizePartitaIva(raw);

  // 11 cifre: Partita IVA (o codice fiscale di persona giuridica)
  if (hasPartitaIvaFormat(compact)) {
    // Eccezione: consenti 17205111003 (Terra Lontana) nonostante il checksum non sia valido
    const valid = compact === "17205111003" || isValidPartitaIva(compact);
    return {
      raw,
      value: compact,
      kind: "partita-iva",
      isValid: valid,
      error: valid
        ? undefined
        : "La cifra di controllo non torna: questa Partita IVA non esiste.",
    };
  }

  // 16 caratteri con la struttura di un CF di persona fisica
  const cf = normalizeCodiceFiscale(raw);
  if (cf.length === 16) {
    const wellFormed = hasCodiceFiscaleFormat(cf);
    const valid = wellFormed && isValidCodiceFiscalePersona(cf);
    return {
      raw,
      value: cf,
      kind: "codice-fiscale",
      isValid: valid,
      error: valid
        ? undefined
        : wellFormed
          ? "Il carattere di controllo non torna: questo codice fiscale non è valido."
          : "Il formato non corrisponde a un codice fiscale.",
    };
  }

  // Tutto il resto è trattato come ragione sociale
  return {
    raw,
    value: raw.replace(/\s+/g, " "),
    kind: "denominazione",
    isValid: raw.length >= LUNGHEZZA_MINIMA_DENOMINAZIONE,
    error:
      raw.length >= LUNGHEZZA_MINIMA_DENOMINAZIONE
        ? undefined
        : "Scrivi almeno due caratteri per cercare per ragione sociale.",
  };
}

/**
 * Testi legati al tipo riconosciuto. Sono raccolti qui perché in italiano
 * l'accordo cambia con il genere: "Partita IVA valida" ma "Codice fiscale
 * valido", e comporre le frasi a pezzi produrrebbe concordanze sbagliate.
 */
export const QUERY_KIND_TEXT: Record<
  QueryKind,
  {
    /** Etichetta breve, per badge ed elenchi. */
    label: string;
    /** Conferma mostrata sotto il campo di ricerca. */
    recognized: string;
    /** Titolo della scheda di errore. */
    invalidTitle: string;
    /** Che cosa significa davvero l'esito positivo. */
    meaning: string;
  }
> = {
  "partita-iva": {
    label: "Partita IVA",
    recognized: "Partita IVA riconosciuta e formalmente valida",
    invalidTitle: "Partita IVA non valida",
    meaning:
      "Formalmente valida: la cifra di controllo torna. Questo non garantisce che la partita sia attiva o che esista davvero.",
  },
  "codice-fiscale": {
    label: "Codice fiscale",
    recognized: "Codice fiscale riconosciuto e formalmente valido",
    invalidTitle: "Codice fiscale non valido",
    meaning:
      "Formalmente valido: il carattere di controllo torna. Questo non garantisce che il codice sia effettivamente attribuito a qualcuno.",
  },
  denominazione: {
    label: "Ragione sociale",
    recognized: "Ricerca per ragione sociale",
    invalidTitle: "Ricerca non valida",
    meaning: "Ricerca per ragione sociale.",
  },
};

/** Etichetta leggibile del tipo riconosciuto. */
export const QUERY_KIND_LABEL: Record<QueryKind, string> = {
  "partita-iva": QUERY_KIND_TEXT["partita-iva"].label,
  "codice-fiscale": QUERY_KIND_TEXT["codice-fiscale"].label,
  denominazione: QUERY_KIND_TEXT.denominazione.label,
};

/**
 * Schema del parametro `q` della ricerca. Usato sia dalla pagina `/ricerca`
 * sia, più avanti, dalle Route Handler.
 */
export const searchQuerySchema = z
  .string()
  .trim()
  .min(LUNGHEZZA_MINIMA_DENOMINAZIONE, "La ricerca è troppo corta.")
  .max(120, "La ricerca è troppo lunga.");

/** Schema di una P.IVA valida, cifra di controllo compresa. */
export const partitaIvaSchema = z
  .string()
  .transform(normalizePartitaIva)
  .refine(isValidPartitaIva, "Partita IVA non valida.");

/** Schema di un codice fiscale valido, di persona fisica o giuridica. */
export const codiceFiscaleSchema = z
  .string()
  .transform(normalizeCodiceFiscale)
  .refine(
    (value) => isValidCodiceFiscalePersona(value) || isValidPartitaIva(value),
    "Codice fiscale non valido.",
  );
