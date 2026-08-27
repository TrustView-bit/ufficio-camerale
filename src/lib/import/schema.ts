import { z } from "zod";

import { normalizePartitaIva, isValidPartitaIva } from "@/lib/validation";

/**
 * Schema canonico di un'impresa importata, indipendente dalla fonte.
 *
 * Il principio è che **le fonti reali sono piene di buchi**: un elenco
 * Telemaco "indirizzi" non ha il capitale sociale, RNA non ha l'ATECO, ANAC
 * non ha la forma giuridica. Rifiutare una riga perché manca un campo
 * significherebbe buttare via quasi tutto.
 *
 * Perciò è obbligatorio solo ciò senza cui la riga non identifica nessuno:
 * partita IVA e denominazione.
 */

export const indirizzoImportSchema = z.object({
  via: z.string().min(1).nullish(),
  civico: z.string().min(1).nullish(),
  cap: z.string().min(1).nullish(),
  comune: z.string().min(1).nullish(),
  provincia: z.string().min(1).nullish(),
  regione: z.string().min(1).nullish(),
});

export const atecoImportSchema = z.object({
  codice: z.string().min(2),
  versione: z.enum(["2022", "2025"]).nullish(),
  descrizione: z.string().min(1).nullish(),
});

export const impresaImportSchema = z.object({
  /** Normalizzata e con la cifra di controllo verificata. */
  partitaIva: z
    .string()
    .transform(normalizePartitaIva)
    .refine(isValidPartitaIva, "cifra di controllo non valida"),

  denominazione: z
    .string()
    .transform((testo) => testo.replace(/\s+/g, " ").trim())
    .refine((testo) => testo.length > 0, "denominazione vuota"),

  codiceFiscale: z.string().min(1).nullish(),
  formaGiuridica: z.string().min(1).nullish(),
  statoAttivita: z
    .enum(["attiva", "inattiva", "in-liquidazione", "cessata", "sconosciuto"])
    .nullish(),

  indirizzo: indirizzoImportSchema.nullish(),
  ateco: atecoImportSchema.nullish(),

  rea: z.string().min(1).nullish(),
  capitaleSociale: z.number().nonnegative().nullish(),
  /** ISO `YYYY-MM-DD` oppure il solo anno `YYYY`. */
  dataCostituzione: z
    .string()
    .regex(/^\d{4}(-\d{2}-\d{2})?$/, "data non riconosciuta")
    .nullish(),
  dipendenti: z.number().int().nonnegative().nullish(),
  fatturato: z.number().nullish(),

  /** Da quale elenco arriva questa riga. */
  fonte: z.string().min(1),
  /** Quando il dato è stato acquisito, in ISO. */
  dataAcquisizione: z.string().min(4),
});

export type ImpresaImport = z.infer<typeof impresaImportSchema>;

/** Esito della validazione di una singola riga. */
export type EsitoRiga =
  | { ok: true; impresa: ImpresaImport }
  | { ok: false; motivo: string; riga: unknown };

export function validaRiga(riga: unknown): EsitoRiga {
  const esito = impresaImportSchema.safeParse(riga);

  if (esito.success) return { ok: true, impresa: esito.data };

  const motivo = esito.error.issues
    .map(
      (problema) => `${problema.path.join(".") || "(riga)"}: ${problema.message}`,
    )
    .join("; ");

  return { ok: false, motivo, riga };
}

/**
 * Priorità delle fonti: a parità di campo vince quella più alta.
 *
 * Un provider a pagamento è più affidabile di un elenco Telemaco, che a sua
 * volta è più affidabile di un elenco di beneficiari di aiuti di Stato, dove
 * la denominazione è quella dichiarata nella domanda.
 */
export const PRIORITA_FONTI: Record<string, number> = {
  openapi: 100,
  cerved: 100,
  "telemaco-esteso": 80,
  "telemaco-indirizzi": 70,
  "ipa-csv": 50,
  "anac-csv": 40,
  "rna-xml": 30,
  mock: 0,
};

export function prioritaDi(fonte: string): number {
  return PRIORITA_FONTI[fonte] ?? 10;
}
