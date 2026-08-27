import { colonna, leggiCsv, numeroItaliano } from "../csv";
import type { ImpresaImport } from "../schema";

/**
 * Elenchi Telemaco / InfoCamere, nelle due varianti a listino:
 * «indirizzi imprese» e «esteso imprese».
 *
 * ⚠️ NON VERIFICATO SU UN FILE REALE. Le intestazioni sono ricavate dalla
 * documentazione del tracciato, non da un'estrazione vera. Per questo ogni
 * campo viene cercato fra più nomi possibili e, se nel file non si trova
 * nemmeno la partita IVA, l'adapter si ferma dicendo quali colonne ha
 * trovato: meglio un errore esplicito che un import silenziosamente vuoto.
 */

export class TracciatoSconosciuto extends Error {}

function statoDa(valore: string | null): ImpresaImport["statoAttivita"] {
  const testo = (valore ?? "").toLowerCase();
  if (!testo) return null;
  if (testo.includes("liquidazione")) return "in-liquidazione";
  if (testo.includes("cessat")) return "cessata";
  if (testo.includes("inattiv") || testo.includes("sospes")) return "inattiva";
  if (testo.includes("attiv")) return "attiva";
  return "sconosciuto";
}

/** Da "12/05/1998" o "19980512" alla forma ISO. */
export function dataDa(valore: string | null): string | null {
  if (!valore) return null;

  const italiana = /^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/.exec(valore);
  if (italiana) return `${italiana[3]}-${italiana[2]}-${italiana[1]}`;

  const compatta = /^(\d{4})(\d{2})(\d{2})$/.exec(valore);
  if (compatta) return `${compatta[1]}-${compatta[2]}-${compatta[3]}`;

  const iso = /^\d{4}-\d{2}-\d{2}/.exec(valore);
  if (iso) return iso[0];

  const anno = /^(19|20)\d{2}$/.exec(valore);
  if (anno) return anno[0];

  return null;
}

function comune(riga: Record<string, string>) {
  const cap = colonna(riga, "cap", "capsede", "capsedelegale");

  return {
    via: colonna(riga, "indirizzo", "via", "toponimo", "indirizzosede"),
    civico: colonna(riga, "civico", "numerocivico"),
    // Excel mangia lo zero iniziale: un CAP italiano ha cinque cifre
    cap: cap && /^\d{1,5}$/.test(cap) ? cap.padStart(5, "0") : cap,
    comune: colonna(riga, "comune", "descrizionecomune", "comunesede"),
    provincia: colonna(riga, "provincia", "siglaprovincia", "pr", "prov"),
    regione: colonna(riga, "regione"),
  };
}

function base(
  riga: Record<string, string>,
  fonte: string,
  dataAcquisizione: string,
): Record<string, unknown> | null {
  const partitaIva = colonna(riga, "partitaiva", "piva", "partitaiva1", "pi");
  const denominazione = colonna(
    riga,
    "denominazione",
    "ragionesociale",
    "denominazioneimpresa",
    "impresa",
  );

  if (!partitaIva || !denominazione) return null;

  return {
    partitaIva,
    denominazione,
    codiceFiscale: colonna(riga, "codicefiscale", "cf"),
    indirizzo: comune(riga),
    fonte,
    dataAcquisizione,
  };
}

function controllaTracciato(
  righe: Record<string, string>[],
  utili: number,
  fonte: string,
) {
  if (righe.length > 0 && utili === 0) {
    throw new TracciatoSconosciuto(
      `nessuna riga utilizzabile da «${fonte}»: non ho trovato le colonne ` +
        `della partita IVA e della denominazione.\n` +
        `  Colonne presenti: ${Object.keys(righe[0]!).join(", ")}\n` +
        `  Aggiungi il nome giusto agli alias in src/lib/import/adapters/telemaco.ts.`,
    );
  }
}

/** Elenco «indirizzi imprese»: anagrafica e sede, niente dati economici. */
export function parseTelemacoIndirizzi(
  contenuto: Buffer,
  dataAcquisizione: string,
): unknown[] {
  const { righe } = leggiCsv(contenuto);
  const imprese = righe
    .map((riga) => base(riga, "telemaco-indirizzi", dataAcquisizione))
    .filter((riga): riga is Record<string, unknown> => riga !== null);

  controllaTracciato(righe, imprese.length, "telemaco-indirizzi");
  return imprese;
}

/** Elenco «esteso imprese»: aggiunge REA, capitale, ATECO, dipendenti. */
export function parseTelemacoEsteso(
  contenuto: Buffer,
  dataAcquisizione: string,
): unknown[] {
  const { righe } = leggiCsv(contenuto);

  const imprese = righe
    .map((riga) => {
      const comune_ = base(riga, "telemaco-esteso", dataAcquisizione);
      if (!comune_) return null;

      const codiceAteco = colonna(
        riga,
        "ateco",
        "codiceateco",
        "attivita",
        "ateco2022",
      );
      const numeroRea = colonna(riga, "rea", "numerorea", "nrea");
      const cciaa = colonna(riga, "cciaa", "camera", "siglacciaa");

      return {
        ...comune_,
        formaGiuridica: colonna(riga, "formagiuridica", "naturagiuridica"),
        statoAttivita: statoDa(
          colonna(riga, "statoattivita", "stato", "statoimpresa"),
        ),
        ateco: codiceAteco
          ? {
              codice: codiceAteco,
              // gli elenchi correnti riportano ancora la classificazione 2022
              versione: "2022" as const,
              descrizione: colonna(riga, "descrizioneateco", "attivitaprevalente"),
            }
          : null,
        rea: numeroRea ? (cciaa ? `${cciaa}-${numeroRea}` : numeroRea) : null,
        capitaleSociale: numeroItaliano(
          colonna(riga, "capitalesociale", "capitale"),
        ),
        dataCostituzione: dataDa(
          colonna(riga, "datacostituzione", "dataiscrizione", "datainizioattivita"),
        ),
        dipendenti: (() => {
          const valore = numeroItaliano(
            colonna(riga, "dipendenti", "numerodipendenti"),
          );
          return valore === null ? null : Math.round(valore);
        })(),
        fatturato: numeroItaliano(colonna(riga, "fatturato", "ricavi")),
      };
    })
    .filter((riga) => riga !== null);

  controllaTracciato(righe, imprese.length, "telemaco-esteso");
  return imprese;
}
