/**
 * Dati identificativi del servizio, usati dalle pagine legali.
 *
 * ⚠️ I valori marcati DA_COMPLETARE vanno sostituiti prima di pubblicare: senza
 * l'identità del titolare del trattamento l'informativa privacy non è valida.
 * Finché restano così, le pagine legali mostrano un avviso ben visibile.
 */

const DA_COMPLETARE = "DA_COMPLETARE";

export const SITE = {
  nome: "Ufficio Camerale",

  /** Persona fisica o giuridica che tratta i dati. */
  titolare: DA_COMPLETARE,
  /** Sede del titolare, per esteso. */
  indirizzoTitolare: DA_COMPLETARE,
  /** Casella per l'esercizio dei diritti dell'interessato. */
  emailPrivacy: DA_COMPLETARE,
  /** Casella per le comunicazioni generali. */
  emailContatti: DA_COMPLETARE,
  /** Facoltativa: obbligatoria solo per i soggetti che devono averla. */
  pec: null as string | null,
  /** Data dell'ultima revisione dei testi legali. */
  ultimoAggiornamentoLegale: "2026-08-26",
} as const;

/** true finché restano campi non compilati. */
export const LEGALE_INCOMPLETO = Object.values(SITE).some(
  (valore) => valore === DA_COMPLETARE,
);

/** Mostra il valore, o un segnaposto evidente se non è ancora stato scelto. */
export function campo(valore: string | null): string {
  if (!valore) return "—";
  return valore === DA_COMPLETARE ? "[ancora da indicare]" : valore;
}
