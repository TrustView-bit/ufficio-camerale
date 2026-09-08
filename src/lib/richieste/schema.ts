import { z } from "zod";

import { DOCUMENTI } from "@/lib/documenti";
import { partitaIvaSchema } from "@/lib/validation";

/**
 * I dati che l'utente lascia per chiedere un documento.
 *
 * Il minimo indispensabile per rispondergli: nome ed email. Il telefono e le
 * note sono facoltativi — meno campi, più richieste completate.
 */
export const richiestaSchema = z.object({
  partitaIva: partitaIvaSchema,
  denominazione: z.string().trim().min(1).max(200),
  documentoId: z
    .string()
    .refine((id) => DOCUMENTI.some((documento) => documento.id === id), {
      message: "Documento non in catalogo.",
    }),
  nome: z.string().trim().min(2, "Serve il nome.").max(120),
  email: z.email("Serve un indirizzo email valido.").max(200),
  telefono: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((valore) => (valore ? valore : null)),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((valore) => (valore ? valore : null)),
  /** Senza consenso non si tratta il dato: la casella è obbligatoria. */
  consenso: z.literal(true, { message: "Serve il consenso al trattamento." }),
});

export type RichiestaInput = z.input<typeof richiestaSchema>;
export type Richiesta = z.output<typeof richiestaSchema>;
