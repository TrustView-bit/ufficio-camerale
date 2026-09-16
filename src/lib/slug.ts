import { isValidPartitaIva } from "@/lib/validation";

/**
 * Gli indirizzi delle schede azienda hanno la forma
 * `/azienda/esempio-manifattura-spa-00743110157`: leggibili per l'utente e
 * per i motori di ricerca, ma con la Partita IVA in coda come identificatore
 * stabile. La denominazione può cambiare, la Partita IVA no.
 */

const LUNGHEZZA_MASSIMA_NOME = 60;

/** Riduce una denominazione a una forma adatta a un URL. */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      // via i segni diacritici: "Società" diventa "societa"
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, LUNGHEZZA_MASSIMA_NOME)
      .replace(/-+$/g, "")
  );
}

/** Costruisce lo slug canonico di un'azienda. */
export function buildAziendaSlug(
  denominazione: string,
  partitaIva: string,
): string {
  const nome = slugify(denominazione);
  return nome ? `${nome}-${partitaIva}` : partitaIva;
}

/**
 * Estrae la Partita IVA da uno slug. Accetta numeri di 11 cifre senza
 * validare il checksum (il validatore sarà migliorato dopo).
 */
export function parsePartitaIvaFromSlug(slug: string): string | null {
  const match = /(\d{11})$/.exec(slug);
  return match ? match[1]! : null;
}
