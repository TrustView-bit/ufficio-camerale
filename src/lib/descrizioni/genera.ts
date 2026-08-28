import type { CompanyData } from "@/lib/providers/types";

import { fattiDi, fattiSufficienti } from "./fatti";
import { messaggioUtente, SISTEMA } from "./prompt";
import { verificaDescrizione } from "./verifica";

/**
 * Composizione di una descrizione, indipendente da chi sia il modello.
 *
 * Il cliente è iniettato: i test usano un modello finto e non chiamano
 * nessuna API. È anche ciò che permetterebbe di cambiare fornitore senza
 * toccare né il prompt né i controlli.
 */

export type ClienteModello = {
  readonly modello: string;
  /** Restituisce il testo, o null se il modello non ha prodotto nulla. */
  scrivi(sistema: string, utente: string): Promise<string | null>;
};

export type EsitoGenerazione =
  | { stato: "scritta"; testo: string; modello: string }
  /** Non si è nemmeno provato: i dati non bastavano. */
  | { stato: "saltata"; motivo: string }
  /** Il modello ha risposto, ma il testo non ha superato i controlli. */
  | { stato: "respinta"; motivo: string }
  | { stato: "errore"; motivo: string };

export async function componiDescrizione(
  company: CompanyData,
  cliente: ClienteModello,
): Promise<EsitoGenerazione> {
  // Le aziende dimostrative hanno dati inventati: una descrizione in prosa
  // li renderebbe ancora più simili a informazioni vere.
  if (company.fittizia) {
    return { stato: "saltata", motivo: "azienda dimostrativa" };
  }

  const fatti = fattiDi(company);

  if (!fattiSufficienti(fatti)) {
    return { stato: "saltata", motivo: "dati insufficienti" };
  }

  let grezzo: string | null;

  try {
    grezzo = await cliente.scrivi(SISTEMA, messaggioUtente(fatti));
  } catch (errore) {
    // una descrizione mancante è un inconveniente, non un guasto della pagina
    return {
      stato: "errore",
      motivo: errore instanceof Error ? errore.message : "chiamata fallita",
    };
  }

  if (!grezzo) return { stato: "errore", motivo: "risposta vuota" };

  const esito = verificaDescrizione(grezzo, fatti);
  if (!esito.ok) return { stato: "respinta", motivo: esito.motivo };

  return { stato: "scritta", testo: esito.testo, modello: cliente.modello };
}
