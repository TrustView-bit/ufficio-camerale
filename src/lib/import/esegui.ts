import { validaRiga, type ImpresaImport } from "./schema";

/** Riga scartata, con il motivo: finisce nel file degli scarti. */
export type Scarto = { indice: number; motivo: string; riga: unknown };

export type Riepilogo = {
  lette: number;
  valide: number;
  inserite: number;
  aggiornate: number;
  invariate: number;
  scartate: number;
  /** Quante righe per ciascun motivo di scarto. */
  motivi: Record<string, number>;
};

export const RIEPILOGO_VUOTO: Riepilogo = {
  lette: 0,
  valide: 0,
  inserite: 0,
  aggiornate: 0,
  invariate: 0,
  scartate: 0,
  motivi: {},
};

/**
 * Valida un blocco di righe grezze, separando quelle buone dagli scarti.
 *
 * Nessuna riga viene persa in silenzio: ogni scarto porta con sé il motivo e
 * la posizione nel file, così si può tornare a guardarlo.
 */
export function validaBlocco(
  righe: unknown[],
  primaRiga: number,
): { imprese: ImpresaImport[]; scarti: Scarto[] } {
  const imprese: ImpresaImport[] = [];
  const scarti: Scarto[] = [];

  righe.forEach((riga, posizione) => {
    const esito = validaRiga(riga);
    if (esito.ok) imprese.push(esito.impresa);
    else
      scarti.push({
        indice: primaRiga + posizione,
        motivo: esito.motivo,
        riga,
      });
  });

  return { imprese, scarti };
}

/** Accorpa i motivi di scarto, per il riepilogo finale. */
export function contaMotivi(scarti: Scarto[]): Record<string, number> {
  const conteggio: Record<string, number> = {};

  for (const scarto of scarti) {
    // il motivo può contenere il valore specifico: si accorpa sul campo
    const chiave = scarto.motivo.split(";")[0]?.trim() ?? scarto.motivo;
    conteggio[chiave] = (conteggio[chiave] ?? 0) + 1;
  }

  return conteggio;
}

/** Divide un elenco in blocchi della dimensione richiesta. */
export function aBlocchi<T>(elementi: T[], dimensione: number): T[][] {
  const blocchi: T[][] = [];
  for (let i = 0; i < elementi.length; i += dimensione) {
    blocchi.push(elementi.slice(i, i + dimensione));
  }
  return blocchi;
}

/** Riga CSV con i campi correttamente protetti dalle virgolette. */
export function rigaCsv(valori: (string | number)[]): string {
  return valori
    .map((valore) => {
      const testo = String(valore);
      return /[";\n\r]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo;
    })
    .join(";");
}
