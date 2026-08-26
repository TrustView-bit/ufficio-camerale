/**
 * Validazione del codice fiscale italiano.
 *
 * - Persona fisica: 16 caratteri alfanumerici con carattere di controllo
 *   finale (DM 23/12/1976).
 * - Persona giuridica: 11 cifre, identiche nella struttura alla Partita IVA.
 *
 * Sono gestiti i codici "omocodici", in cui una o più cifre sono sostituite
 * da lettere per distinguere due persone che genererebbero lo stesso codice.
 */

import { isValidPartitaIva } from "./partita-iva";

/** Valori dei caratteri nelle posizioni dispari (1a, 3a, 5a, …). */
const ODD: Record<string, number> = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

/** Valori dei caratteri nelle posizioni pari: 0-9 → 0-9, A-Z → 0-25. */
function evenValue(char: string): number | null {
  if (char >= "0" && char <= "9") return char.charCodeAt(0) - 48;
  if (char >= "A" && char <= "Z") return char.charCodeAt(0) - 65;
  return null;
}

/** Lettere usate dall'omocodia al posto delle cifre 0-9, nell'ordine. */
const OMOCODIA = "LMNPQRSTUV";

/** Struttura di un CF di persona fisica, omocodia inclusa. */
const CF_PATTERN =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

/** Rimuove spazi e punteggiatura, porta in maiuscolo. */
export function normalizeCodiceFiscale(input: string): string {
  return input.toUpperCase().replace(/[\s.\-/]/g, "");
}

/** Verifica il solo formato di un CF di persona fisica (16 caratteri). */
export function hasCodiceFiscaleFormat(value: string): boolean {
  return CF_PATTERN.test(value);
}

/**
 * Calcola il carattere di controllo dai primi 15 caratteri.
 * Restituisce null se l'input non è utilizzabile.
 */
export function codiceFiscaleCheckChar(first15: string): string | null {
  if (!/^[A-Z0-9]{15}$/.test(first15)) return null;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = first15[i]!;
    // i è 0-based: le posizioni dispari del decreto sono gli indici pari
    if (i % 2 === 0) {
      const value = ODD[char];
      if (value === undefined) return null;
      sum += value;
    } else {
      const value = evenValue(char);
      if (value === null) return null;
      sum += value;
    }
  }

  return String.fromCharCode(65 + (sum % 26));
}

/** Valida un CF di persona fisica: formato + carattere di controllo. */
export function isValidCodiceFiscalePersona(value: string): boolean {
  if (!hasCodiceFiscaleFormat(value)) return false;
  return codiceFiscaleCheckChar(value.slice(0, 15)) === value[15];
}

/**
 * Valida un CF di persona giuridica: 11 cifre con la stessa cifra di
 * controllo della Partita IVA.
 */
export function isValidCodiceFiscaleAzienda(value: string): boolean {
  return isValidPartitaIva(value);
}

/** Valida un codice fiscale di persona fisica o giuridica. */
export function isValidCodiceFiscale(value: string): boolean {
  return isValidCodiceFiscalePersona(value) || isValidCodiceFiscaleAzienda(value);
}

/**
 * Riporta un CF omocodico alla sua forma numerica originale, sostituendo le
 * lettere di omocodia con le cifre corrispondenti e ricalcolando il carattere
 * di controllo. Utile per capire se due codici identificano la stessa
 * anagrafica. Restituisce il valore invariato se non è un CF di 16 caratteri.
 */
export function unscrambleOmocodia(value: string): string {
  if (!hasCodiceFiscaleFormat(value)) return value;

  // Le posizioni che in origine contengono cifre: anno, giorno, codice catastale
  const numericPositions = [6, 7, 9, 10, 12, 13, 14];
  const chars = value.split("");

  for (const position of numericPositions) {
    const index = OMOCODIA.indexOf(chars[position]!);
    if (index !== -1) chars[position] = String(index);
  }

  const base = chars.slice(0, 15).join("");
  const check = codiceFiscaleCheckChar(base);
  return check === null ? value : base + check;
}
