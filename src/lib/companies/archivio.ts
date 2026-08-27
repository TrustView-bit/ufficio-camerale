import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  sql,
  type SQL,
} from "drizzle-orm";

import { companies } from "@/lib/db/schema";
import { regioneDiSigla } from "@/lib/geo";
import type {
  EsitoElenco,
  EsitoRicerca,
  FiltriElenco,
  OpzioniRicerca,
  RisultatoAzienda,
  StatoAttivita,
  VoceAggregata,
} from "@/lib/providers/types";

import { type Database } from "./repository";

/**
 * Elenchi e ricerche costruiti sull'**archivio**, non sul fornitore.
 *
 * È l'architettura prevista fin dall'inizio: un'API a pagamento non lascia
 * enumerare il proprio contenuto — si può chiedere una partita IVA alla volta,
 * non «tutte le imprese di Bergamo». Le pagine di navigazione si costruiscono
 * quindi sui dati man mano salvati, e crescono con l'uso del sito.
 */

/** La provincia vive dentro il jsonb della sede. */
const provinciaSql = sql<string>`${companies.sede}->>'provincia'`;
const comuneSql = sql<string>`${companies.sede}->>'comune'`;

function inSintesi(riga: {
  partitaIva: string;
  denominazione: string;
  sede: unknown;
  statoAttivita: string;
}): RisultatoAzienda {
  const sede = riga.sede as { comune?: string; provincia?: string } | null;

  return {
    partitaIva: riga.partitaIva,
    denominazione: riga.denominazione,
    comune: sede?.comune ?? null,
    provincia: sede?.provincia ?? null,
    statoAttivita: riga.statoAttivita as StatoAttivita,
  };
}

/** Traduce i filtri delle pagine in condizioni SQL. */
function condizioni(filtri: FiltriElenco): SQL[] {
  const parti: SQL[] = [];

  if (filtri.provincia) parti.push(eq(provinciaSql, filtri.provincia));
  if (filtri.comune) parti.push(eq(comuneSql, filtri.comune));
  if (filtri.ateco) {
    parti.push(ilike(companies.atecoPrimario, `${filtri.ateco}%`));
  }

  // la regione non è una colonna: si traduce nell'elenco delle sue province
  if (filtri.regione) {
    const sigle = sigleDiRegione(filtri.regione);
    // inArray genera un IN (…): `= ANY(array)` con un array JS produrrebbe un
    // costruttore di riga, che Postgres rifiuta
    parti.push(sigle.length > 0 ? inArray(provinciaSql, sigle) : sql`false`);
  }

  return parti;
}

/** Tutte le sigle di provincia italiane. */
const SIGLE_NOTE = (
  "AG AL AN AO AP AQ AR AT AV BA BG BI BL BN BO BR BS BT BZ CA CB CE CH CL CN CO CR CS CT CZ " +
  "EN FC FE FG FI FM FR GE GO GR IM IS KR LC LE LI LO LT LU MB MC ME MI MN MO MS MT NA NO NU " +
  "OR PA PC PD PE PG PI PN PO PR PT PU PV PZ RA RC RE RG RI RM RN RO SA SI SO SP SR SS SU SV " +
  "TA TE TN TO TP TR TS TV UD VA VB VC VE VI VR VT VV"
).split(" ");

/**
 * Le sigle delle province di una regione.
 *
 * La regione non è una colonna: nell'archivio c'è solo la sigla dentro il
 * jsonb della sede, quindi il filtro per regione diventa un filtro sulle sue
 * province. L'indice si costruisce una volta sola.
 */
const SIGLE_PER_REGIONE = (() => {
  const mappa = new Map<string, string[]>();

  for (const sigla of SIGLE_NOTE) {
    const regione = regioneDiSigla(sigla);
    if (!regione) continue;

    const elenco = mappa.get(regione) ?? [];
    elenco.push(sigla);
    mappa.set(regione, elenco);
  }

  return mappa;
})();

function sigleDiRegione(regione: string): string[] {
  return SIGLE_PER_REGIONE.get(regione) ?? [];
}

export async function elencoInArchivio(
  db: Database,
  filtri: FiltriElenco,
  opzioni: OpzioniRicerca = {},
): Promise<EsitoElenco> {
  const { offset = 0, limite = 24 } = opzioni;
  const dove = condizioni(filtri);
  const filtro = dove.length > 0 ? and(...dove) : undefined;

  const [totale] = await db
    .select({ quante: count() })
    .from(companies)
    .where(filtro);

  const righe = await db
    .select({
      partitaIva: companies.partitaIva,
      denominazione: companies.denominazione,
      sede: companies.sede,
      statoAttivita: companies.statoAttivita,
    })
    .from(companies)
    .where(filtro)
    .orderBy(asc(companies.denominazione))
    .limit(limite)
    .offset(offset);

  return { totale: totale?.quante ?? 0, risultati: righe.map(inSintesi) };
}

export async function aggregaInArchivio(
  db: Database,
  filtri: FiltriElenco,
  per: "regione" | "provincia" | "comune" | "ateco",
): Promise<VoceAggregata[]> {
  const dove = condizioni(filtri);

  // la regione si ottiene raggruppando per provincia e sommando dopo
  const chiave =
    per === "comune"
      ? comuneSql
      : per === "ateco"
        ? sql<string>`left(${companies.atecoPrimario}, 2)`
        : provinciaSql;

  const righe = await db
    .select({ chiave, quante: count() })
    .from(companies)
    .where(and(...dove, isNotNull(companies.sede)))
    .groupBy(chiave);

  const conteggio = new Map<string, number>();

  for (const riga of righe) {
    if (!riga.chiave) continue;

    const nome =
      per === "regione" ? (regioneDiSigla(riga.chiave) ?? null) : riga.chiave;
    if (!nome) continue;

    conteggio.set(nome, (conteggio.get(nome) ?? 0) + riga.quante);
  }

  return [...conteggio.entries()]
    .map(([chiave, quante]) => ({ chiave, quante }))
    .sort((a, b) => b.quante - a.quante || a.chiave.localeCompare(b.chiave, "it"));
}

export async function cercaInArchivio(
  db: Database,
  query: string,
  opzioni: OpzioniRicerca = {},
): Promise<EsitoRicerca> {
  const { provincia, offset = 0, limite = 20 } = opzioni;

  // ogni parola digitata deve comparire: chi cerca due parole non vuole i
  // risultati che ne contengono una sola
  const parole = query.trim().split(/\s+/).filter(Boolean);
  const dove: SQL[] = parole.map((parola) =>
    ilike(companies.denominazione, `%${parola}%`),
  );

  const filtroBase = dove.length > 0 ? and(...dove) : undefined;

  // le province si contano PRIMA di filtrare, altrimenti sceglierne una
  // nasconderebbe le alternative
  const perProvincia = await db
    .select({ chiave: provinciaSql, quante: count() })
    .from(companies)
    .where(filtroBase)
    .groupBy(provinciaSql);

  const filtro = provincia
    ? and(filtroBase, eq(provinciaSql, provincia))
    : filtroBase;

  const [totale] = await db
    .select({ quante: count() })
    .from(companies)
    .where(filtro);

  const righe = await db
    .select({
      partitaIva: companies.partitaIva,
      denominazione: companies.denominazione,
      sede: companies.sede,
      statoAttivita: companies.statoAttivita,
    })
    .from(companies)
    .where(filtro)
    .orderBy(asc(companies.denominazione))
    .limit(limite)
    .offset(offset);

  return {
    totale: totale?.quante ?? 0,
    risultati: righe.map(inSintesi),
    province: perProvincia
      .filter((riga) => riga.chiave)
      .map((riga) => ({ sigla: riga.chiave, quante: riga.quante }))
      .sort((a, b) => b.quante - a.quante || a.sigla.localeCompare(b.sigla)),
  };
}
