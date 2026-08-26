import comuniJson from "../../data/comuni.json";

/**
 * Normalizzazione di comuni e province italiane.
 *
 * Serve soprattutto agli indirizzi VIES, che arrivano tutti in maiuscolo e
 * senza alcuna normalizzazione: "20122 MILANO MI" va riportato a un comune
 * riconosciuto, con la sua provincia e la sua regione.
 */

type RigaComune = [nome: string, codiceIstat: string, sigla: string, cap: string];

const PROVINCE = comuniJson.province as Record<
  string,
  { nome: string; regione: string }
>;
const COMUNI = comuniJson.comuni as RigaComune[];

export type ComuneNormalizzato = {
  comune: string;
  codiceIstat: string;
  provincia: string;
  sigla: string;
  regione: string;
  /** CAP principale del comune: i comuni grandi ne hanno molti. */
  cap: string | null;
};

/**
 * Chiave di confronto: via accenti, apostrofi, trattini e maiuscole.
 * "Sant'Ambrogio di Torino" e "SANT AMBROGIO DI TORINO" collassano sulla
 * stessa chiave.
 */
export function chiaveComune(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * I nomi bilingui arrivano scritti con la barra ("Bolzano/Bozen"): si indicizza
 * anche ciascuna metà, così entrambe le forme trovano il comune.
 *
 * Attenzione: il dataset contiene i soli nomi italiani dei comuni, quindi
 * "Bozen" da solo non risolve — risolve "Bolzano/Bozen", che è la forma in cui
 * le fonti ufficiali lo scrivono.
 */
function chiaviDi(nome: string): string[] {
  const chiavi = new Set<string>([chiaveComune(nome)]);

  if (nome.includes("/")) {
    for (const parte of nome.split("/")) {
      const chiave = chiaveComune(parte);
      if (chiave) chiavi.add(chiave);
    }
  }

  return [...chiavi];
}

/** Indice costruito una sola volta all'avvio. */
const INDICE = (() => {
  const mappa = new Map<string, RigaComune[]>();

  for (const riga of COMUNI) {
    for (const chiave of chiaviDi(riga[0])) {
      const esistenti = mappa.get(chiave);
      if (esistenti) esistenti.push(riga);
      else mappa.set(chiave, [riga]);
    }
  }

  return mappa;
})();

/** Indice inverso: dal nome della provincia alla sua sigla. */
const SIGLA_PER_NOME = (() => {
  const mappa = new Map<string, string>();

  for (const [sigla, provincia] of Object.entries(PROVINCE)) {
    for (const chiave of chiaviDi(provincia.nome)) mappa.set(chiave, sigla);
  }

  return mappa;
})();

function componi(riga: RigaComune): ComuneNormalizzato {
  const provincia = PROVINCE[riga[2]];

  return {
    comune: riga[0],
    codiceIstat: riga[1],
    provincia: provincia?.nome ?? riga[2],
    sigla: riga[2],
    regione: provincia?.regione ?? "",
    cap: riga[3] || null,
  };
}

/** Nome esteso di una provincia dalla sua sigla. "MI" → "Milano". */
export function siglaToProvincia(sigla: string): string | null {
  return PROVINCE[sigla.trim().toUpperCase()]?.nome ?? null;
}

/** Sigla di una provincia dal suo nome. "Milano" → "MI". */
export function provinciaToSigla(nome: string): string | null {
  return SIGLA_PER_NOME.get(chiaveComune(nome)) ?? null;
}

/**
 * Riconosce un comune italiano da un nome scritto in qualunque modo.
 *
 * Sei nomi di comune sono usati da più di un comune (Samone, Calliano, Livo,
 * Peglio, Castro, Castello): senza provincia la richiesta è ambigua e si
 * restituisce null, invece di scegliere a caso.
 */
export function normalizzaComune(
  nome: string,
  provincia?: string | null,
): ComuneNormalizzato | null {
  // Il nome può arrivare nella forma bilingue "Bolzano/Bozen": si prova
  // l'intera stringa e poi ciascuna metà.
  for (const chiave of chiaviDi(nome)) {
    const candidati = INDICE.get(chiave);
    if (!candidati || candidati.length === 0) continue;

    if (candidati.length === 1) return componi(candidati[0]!);

    if (provincia) {
      // la provincia può arrivare come sigla ("MI") o per esteso ("Milano")
      const sigla =
        provincia.trim().length === 2
          ? provincia.trim().toUpperCase()
          : provinciaToSigla(provincia);

      const scelto = candidati.find((riga) => riga[2] === sigla);
      if (scelto) return componi(scelto);
    }

    // omonimi senza provincia: ambiguo, non si sceglie a caso
    return null;
  }

  return null;
}

/** Metadati della fonte, per dichiararla in pagina. */
export const GEO_META = {
  fonte: comuniJson.fonte,
  repository: comuniJson.repository,
  scaricato: comuniJson.scaricato,
  comuni: COMUNI.length,
} as const;

/** Parole che restano minuscole dentro un nome proprio italiano. */
const MINUSCOLE = new Set([
  "di",
  "de",
  "del",
  "della",
  "delle",
  "dei",
  "degli",
  "da",
  "dal",
  "dalla",
  "e",
  "ed",
  "in",
  "il",
  "lo",
  "la",
  "le",
  "i",
  "gli",
  "a",
  "al",
  "allo",
  "alla",
  "d",
  "l",
  "su",
  "sul",
  "con",
]);

/**
 * Da "LARGO FRANCESCO RICHINI 6" a "Largo Francesco Richini 6".
 *
 * Le fonti ufficiali scrivono tutto in maiuscolo; letto in una scheda sembra
 * un urlo. Le sigle di due lettere restano tali, i numeri civici pure.
 */
export function titoloProprio(testo: string): string {
  return testo
    .split(/(\s+)/)
    .map((pezzo, indice) => {
      if (pezzo === "" || /^\s+$/.test(pezzo)) return pezzo;

      const minuscolo = pezzo.toLocaleLowerCase("it-IT");

      // preposizioni e articoli restano minuscoli, tranne in apertura
      if (indice > 0 && MINUSCOLE.has(minuscolo)) return minuscolo;

      // numeri civici e simili
      if (/\d/.test(pezzo)) return pezzo.toUpperCase();

      // cifre romane: "Via XX Settembre", "Via IV Novembre". Il controllo
      // viene dopo le preposizioni, altrimenti "DI" e "LI" sembrerebbero
      // numeri romani.
      if (pezzo.length >= 2 && /^[IVXLCDM]+$/i.test(pezzo)) {
        return pezzo.toUpperCase();
      }

      // "sant'ambrogio" va maiuscolo anche dopo l'apostrofo
      return minuscolo.replace(
        /(^|[’'\-])([a-zà-ÿ])/g,
        (_, separatore: string, lettera: string) =>
          separatore + lettera.toLocaleUpperCase("it-IT"),
      );
    })
    .join("");
}

/** Riga finale di un indirizzo italiano: "20122 MILANO MI". */
const RIGA_LOCALITA = /^(\d{5})\s+(.+?)(?:\s+([A-Z]{2}))?$/i;

/**
 * Interpreta un indirizzo italiano scritto su più righe, come lo restituisce
 * VIES: via sulle prime righe, CAP, comune e sigla sull'ultima.
 *
 * Il comune viene riconosciuto sul dataset Istat; se non risulta, si conserva
 * comunque quanto scritto, senza inventare provincia o regione.
 */
export function analizzaIndirizzoItaliano(testo: string): {
  via: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  nazione: string;
  /** true quando il comune è stato riconosciuto nel dataset Istat. */
  comuneRiconosciuto: boolean;
} | null {
  const righe = testo
    .split(/[\n\r]+/)
    .map((riga) => riga.trim())
    .filter(Boolean);

  if (righe.length === 0) return null;

  let indiceLocalita = -1;
  let corrispondenza: RegExpExecArray | null = null;

  for (let i = righe.length - 1; i >= 0; i--) {
    const trovata = RIGA_LOCALITA.exec(righe[i]!);
    if (trovata) {
      indiceLocalita = i;
      corrispondenza = trovata;
      break;
    }
  }

  const righeVia = indiceLocalita === -1 ? righe : righe.slice(0, indiceLocalita);
  const via = righeVia.length > 0 ? titoloProprio(righeVia.join(", ")) : null;

  if (!corrispondenza) {
    return via
      ? {
          via,
          cap: null,
          comune: null,
          provincia: null,
          nazione: "IT",
          comuneRiconosciuto: false,
        }
      : null;
  }

  const [, cap, comuneGrezzo, sigla] = corrispondenza;
  const riconosciuto = normalizzaComune(comuneGrezzo!, sigla ?? null);

  return {
    via,
    cap: cap ?? null,
    comune: riconosciuto?.comune ?? titoloProprio(comuneGrezzo!),
    provincia: riconosciuto?.sigla ?? sigla?.toUpperCase() ?? null,
    nazione: "IT",
    comuneRiconosciuto: Boolean(riconosciuto),
  };
}
