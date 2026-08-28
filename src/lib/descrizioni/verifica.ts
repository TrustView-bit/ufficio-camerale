import { estraiNumeri, type Fatto, numeriAmmessi } from "./fatti";

/**
 * Il controllo che si può fare davvero.
 *
 * Non esiste un modo automatico di accertare che una frase sia vera. Esiste
 * però un modo di accertare che ogni cifra del testo venga dai dati: le date,
 * gli importi e i conteggi sono la classe di invenzione più dannosa e più
 * facile da produrre, ed è quella che questo controllo chiude.
 *
 * Un testo respinto non si mostra e non si salva: la scheda resta come era.
 */

const MINIMO = 120;
const MASSIMO = 700;

export type EsitoVerifica =
  { ok: true; testo: string } | { ok: false; motivo: string };

export function verificaDescrizione(grezzo: string, fatti: Fatto[]): EsitoVerifica {
  const testo = grezzo.trim();

  if (testo.length < MINIMO) {
    return { ok: false, motivo: `troppo breve (${testo.length} caratteri)` };
  }

  if (testo.length > MASSIMO) {
    return { ok: false, motivo: `troppo lungo (${testo.length} caratteri)` };
  }

  // il modello a volte impagina: qui la descrizione è un paragrafo e basta
  if (/[#*`]|^\s*[-•]\s/m.test(testo)) {
    return { ok: false, motivo: "contiene formattazione" };
  }

  const ammessi = numeriAmmessi(fatti);

  for (const numero of estraiNumeri(testo)) {
    if (!ammessi.has(numero)) {
      return { ok: false, motivo: `cifra non presente nei dati: ${numero}` };
    }
  }

  return { ok: true, testo };
}
