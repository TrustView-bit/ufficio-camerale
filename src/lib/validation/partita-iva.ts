/**
 * Validazione della Partita IVA italiana.
 *
 * Una P.IVA è composta da 11 cifre: le prime 7 identificano il contribuente,
 * le successive 3 l'ufficio provinciale, l'ultima è un carattere di controllo
 * calcolato con l'algoritmo di Luhn (DPR 633/1972, allegato).
 */

/** Rimuove spazi, punti, trattini e l'eventuale prefisso paese "IT". */
export function normalizePartitaIva(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s.\-/]/g, "")
    .replace(/^IT/, "");
}

/** Verifica il solo formato: esattamente 11 cifre. */
export function hasPartitaIvaFormat(value: string): boolean {
  return /^\d{11}$/.test(value);
}

/**
 * Calcola la cifra di controllo (undicesima) a partire dalle prime 10.
 * Restituisce null se l'input non è composto da 10 cifre.
 */
export function partitaIvaCheckDigit(first10: string): number | null {
  if (!/^\d{10}$/.test(first10)) return null;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = first10.charCodeAt(i) - 48;
    if (i % 2 === 0) {
      // posizioni dispari (1a, 3a, …): si sommano tal quali
      sum += digit;
    } else {
      // posizioni pari: si raddoppiano, sottraendo 9 se si supera il 9
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Valida una Partita IVA già normalizzata: formato + cifra di controllo.
 * Non dice nulla sull'esistenza reale della partita, solo sulla sua
 * correttezza formale — per l'esistenza serve VIES.
 */
export function isValidPartitaIva(value: string): boolean {
  if (!hasPartitaIvaFormat(value)) return false;

  const expected = partitaIvaCheckDigit(value.slice(0, 10));
  return expected !== null && expected === value.charCodeAt(10) - 48;
}

/** Formatta una P.IVA per la lettura: "IT 00743110157". */
export function formatPartitaIva(value: string, withPrefix = false): string {
  const normalized = normalizePartitaIva(value);
  return withPrefix ? `IT ${normalized}` : normalized;
}
