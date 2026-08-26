import type { Indirizzo } from "@/lib/providers/types";

/** Formattatori italiani, condivisi da tutte le schede. */

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const DATA_LUNGA = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatEuro(value: number | null): string | null {
  return value === null ? null : EURO.format(value);
}

/** Da "1962-04-17" a "17 aprile 1962". */
export function formatDataIso(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : DATA_LUNGA.format(date);
}

export function formatDataOra(date: Date): string {
  return DATA_LUNGA.format(date);
}

/** Anni compiuti dalla data di costituzione. */
export function anniDi(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const start = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;

  let anni = now.getUTCFullYear() - start.getUTCFullYear();
  const compleannoPassato =
    now.getUTCMonth() > start.getUTCMonth() ||
    (now.getUTCMonth() === start.getUTCMonth() &&
      now.getUTCDate() >= start.getUTCDate());
  if (!compleannoPassato) anni -= 1;

  return anni >= 0 ? anni : null;
}

/** Indirizzo su una riga: "Via Roma 1, 20100 Milano (MI)". */
export function formatIndirizzo(sede: Indirizzo | null): string | null {
  if (!sede) return null;

  const localita = [sede.cap, sede.comune].filter(Boolean).join(" ");
  const conProvincia = sede.provincia
    ? `${localita} (${sede.provincia})`
    : localita;
  const parti = [sede.via, conProvincia].map((p) => p?.trim()).filter(Boolean);

  return parti.length > 0 ? parti.join(", ") : null;
}

/** Numero di telefono in forma utilizzabile da un link tel:. */
export function toTelHref(telefono: string | null): string | null {
  if (!telefono) return null;
  const pulito = telefono.replace(/[^\d+]/g, "");
  return pulito.length >= 6 ? `tel:${pulito}` : null;
}

/** Aggiunge lo schema a un sito web scritto senza. */
export function toSitoHref(sito: string | null): string | null {
  if (!sito) return null;
  const valore = sito.trim();
  if (!valore) return null;
  return /^https?:\/\//i.test(valore) ? valore : `https://${valore}`;
}

/** Etichetta breve di un sito, senza schema né www. */
export function hostnameDi(sito: string | null): string | null {
  const href = toSitoHref(sito);
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Oscura la parte centrale del codice fiscale di una persona fisica.
 *
 * I sei caratteri centrali codificano data e luogo di nascita: pubblicarli in
 * chiaro accanto a nome e cognome di un titolare di ditta individuale
 * significa diffondere dati personali che non servono a identificare
 * l'impresa. "FRRGPPXXAXXG535B" diventa "FRRGPP*****G535B".
 *
 * Il codice fiscale di una persona giuridica coincide con la Partita IVA e
 * non viene toccato: non riguarda una persona fisica.
 */
export function mascheraCodiceFiscale(codice: string | null): string | null {
  if (!codice) return null;

  const pulito = codice.trim().toUpperCase();
  if (pulito.length !== 16) return pulito;

  return `${pulito.slice(0, 6)}${"*".repeat(5)}${pulito.slice(11)}`;
}
