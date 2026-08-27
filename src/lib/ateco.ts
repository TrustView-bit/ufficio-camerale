import raccordoJson from "../../data/ateco-raccordo.json";
import strutturaJson from "../../data/ateco.json";

/**
 * Descrizioni ATECO leggibili, a partire dai dataset Istat committati in
 * `data/`. I file si rigenerano a mano con `npm run build:ateco`.
 *
 * Il problema pratico che questo modulo risolve: i fornitori di dati camerali
 * restituiscono ancora in larga parte codici ATECO 2022, mentre la
 * classificazione in vigore è la 2025. Cercare un codice 2022 nella tabella
 * 2025 non dà nulla, e la conversione non è uno a uno — un terzo dei codici
 * 2022 corrisponde a più codici 2025.
 */

type VoceAteco = { titolo: string; livello: number; padre: string | null };

const VOCI = strutturaJson.voci as Record<string, VoceAteco>;
const DA_2022_A_2025 = raccordoJson.da2022a2025 as Record<string, string[]>;
const DA_2025_A_2022 = raccordoJson.da2025a2022 as Record<string, string[]>;

export type VersioneAteco = "2022" | "2025";

export type AtecoRisolto = {
  /** Codice ATECO 2025 di cui stiamo restituendo la descrizione. */
  codice: string;
  descrizione: string;
  /** 1 sezione, 2 divisione, 3 gruppo, 4 classe, 5 categoria, 6 sottocategoria. */
  livello: number;
  /** In quale classificazione è stato riconosciuto il codice in ingresso. */
  versioneRisolta: VersioneAteco;
  /**
   * false quando la descrizione è approssimata: la conversione era ambigua e
   * si è risaliti a un livello superiore, oppure il codice non esisteva e si è
   * troncato. La UI dovrebbe segnalarlo.
   */
  esatta: boolean;
};

/**
 * Riporta un codice alla forma puntata di Istat.
 * Accetta "620100", "62.01.00", "62-01-00", " 62.01.00 ".
 */
export function normalizzaCodiceAteco(codice: string): string | null {
  const pulito = codice
    .trim()
    .toUpperCase()
    .replace(/[\s,\-/]/g, ".");

  // sezione: una lettera singola
  if (/^[A-U]$/.test(pulito)) return pulito;

  const cifre = pulito.replace(/\D/g, "");
  if (cifre.length < 2 || cifre.length > 6) return null;

  // 62 → 62 · 621 → 62.1 · 6210 → 62.10 · 62100 → 62.10.0 · 621000 → 62.10.00
  const parti = [cifre.slice(0, 2), cifre.slice(2, 4), cifre.slice(4, 6)].filter(
    (parte) => parte.length > 0,
  );

  return parti.join(".");
}

/** Catena di antenati di un codice, dal codice stesso fino alla sezione. */
function catenaAntenati(codice: string): string[] {
  const catena: string[] = [];
  let corrente: string | null = codice;

  // il limite protegge da eventuali cicli nei dati di origine
  while (corrente && catena.length < 10) {
    catena.push(corrente);
    corrente = VOCI[corrente]?.padre ?? null;
  }

  return catena;
}

/**
 * Il codice più specifico condiviso da tutti quelli passati.
 * Con ["01.13.11", "01.13.20"] restituisce "01.13".
 */
export function antenatoComune(codici: string[]): string | null {
  if (codici.length === 0) return null;
  if (codici.length === 1) return VOCI[codici[0]!] ? codici[0]! : null;

  const catene = codici.map(catenaAntenati);
  const [prima, ...altre] = catene;

  // le catene vanno dal più specifico al più generale: il primo elemento
  // presente in tutte è l'antenato comune più profondo
  for (const candidato of prima!) {
    if (altre.every((catena) => catena.includes(candidato))) return candidato;
  }

  return null;
}

/** Candidati ottenuti accorciando il codice di un livello alla volta. */
function candidatiPiuGenerici(codice: string): string[] {
  const candidati: string[] = [];
  let corrente = codice;

  while (corrente.length > 1) {
    corrente = corrente.slice(0, -1).replace(/\.$/, "");
    if (corrente.length >= 2) candidati.push(corrente);
  }

  return candidati;
}

function componi(
  codice: string,
  versioneRisolta: VersioneAteco,
  esatta: boolean,
): AtecoRisolto | null {
  const voce = VOCI[codice];
  if (!voce) return null;

  return {
    codice,
    descrizione: voce.titolo,
    livello: voce.livello,
    versioneRisolta,
    esatta,
  };
}

/**
 * Descrizione leggibile di un codice ATECO.
 *
 * La cascata, nell'ordine: struttura 2025 → conversione dal raccordo 2022 →
 * troncamento al livello gerarchico superiore. Se nemmeno la divisione esiste
 * restituisce null: meglio nessuna descrizione che una inventata.
 *
 * @param versione dichiara in quale classificazione è espresso il codice.
 *   Omettendola si prova prima la 2025 e poi la conversione dalla 2022, che è
 *   il comportamento giusto quando non si sa cosa abbia mandato il fornitore.
 */
export function descriviAteco(
  codice: string,
  versione?: VersioneAteco,
): AtecoRisolto | null {
  const normalizzato = normalizzaCodiceAteco(codice);
  if (!normalizzato) return null;

  // 1. il codice è già ATECO 2025
  if (versione !== "2022") {
    const esatto = componi(normalizzato, "2025", true);
    if (esatto) return esatto;
  }

  // 2. è un codice 2022: si passa dal raccordo
  const corrispondenti = DA_2022_A_2025[normalizzato];
  if (corrispondenti && corrispondenti.length > 0) {
    if (corrispondenti.length === 1) {
      const unico = componi(corrispondenti[0]!, "2022", true);
      if (unico) return unico;
    }

    // conversione ambigua: si sale al livello condiviso invece di scegliere
    // arbitrariamente il primo risultato
    const comune = antenatoComune(corrispondenti);
    if (comune) {
      const risolto = componi(comune, "2022", false);
      if (risolto) return risolto;
    }
  }

  // 3. codice sconosciuto: si accorcia finché qualcosa combacia
  for (const candidato of candidatiPiuGenerici(normalizzato)) {
    const risolto = componi(candidato, "2025", false);
    if (risolto) return risolto;
  }

  return null;
}

/** I codici ATECO 2022 corrispondenti a un codice 2025. */
export function codici2022Di(codice2025: string): string[] {
  const normalizzato = normalizzaCodiceAteco(codice2025);
  return normalizzato ? (DA_2025_A_2022[normalizzato] ?? []) : [];
}

/** Metadati dei dataset, per dichiarare in pagina da dove vengono i dati. */
export const ATECO_META = {
  versione: strutturaJson.versione,
  fonteStruttura: strutturaJson.fonte,
  fonteRaccordo: raccordoJson.fonte,
  scaricato: strutturaJson.scaricato,
} as const;

/**
 * Indirizzo leggibile di un settore: "62-attivita-di-programmazione".
 * Il codice resta in testa perché è l'identificatore stabile — la
 * descrizione può cambiare fra una revisione Istat e l'altra.
 */
export function slugAteco(codice: string, descrizione: string): string {
  const nome = descrizione
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  const pulito = codice.replace(/\./g, "-");
  return nome ? `${pulito}-${nome}` : pulito;
}

/** Ricava il codice dall'inizio di uno slug di settore. */
export function codiceDaSlugAteco(slug: string): string | null {
  const trovato = /^([0-9]{1,2}(?:-[0-9]{1,2}){0,2})(?:-|$)/.exec(slug);
  if (!trovato) return null;

  return normalizzaCodiceAteco(trovato[1]!.replace(/-/g, "."));
}

/** Tutte le divisioni ATECO 2025, cioè i codici a due cifre. */
export function divisioni(): { codice: string; titolo: string }[] {
  return Object.entries(VOCI)
    .filter(([codice, voce]) => voce.livello === 2 && /^\d{2}$/.test(codice))
    .map(([codice, voce]) => ({ codice, titolo: voce.titolo }))
    .sort((a, b) => a.codice.localeCompare(b.codice));
}
