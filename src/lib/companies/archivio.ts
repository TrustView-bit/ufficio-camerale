import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";

import { companies } from "@/lib/db/schema";
import { regioneDiSigla } from "@/lib/geo";
import { chiaveRicerca } from "@/lib/ricerca";
import type {
  AziendaInEvidenza,
  EsitoElenco,
  EsitoRicerca,
  FiltriElenco,
  OpzioniRicerca,
  Raggruppamento,
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

/**
 * Quanti dati sostanziali ha una riga, in SQL.
 *
 * È `datiSostanziali()` di `@/lib/scheda` riscritta per Postgres: la scheda
 * decide con quella se mettersi in `noindex`, la sitemap decide con questa se
 * proporre l'indirizzo. Se le due divergessero, si chiederebbe ai motori di
 * visitare pagine a cui si è appena detto di non indicizzare.
 */
export const datiSostanzialiSql = sql<number>`(
  ${presente(companies.formaGiuridica)}
  + ${presente(companies.dataCostituzione)}
  + ${presente(companies.reaNumero)}
  + ${presente(companies.capitaleSociale)}
  + ${presente(companies.atecoPrimario)}
  + ${presente(companies.pec)}
  + ${presente(companies.sitoWeb)}
  + ${presente(companies.telefono)}
  + ${presente(companies.dipendenti)}
  + ${nonVuoto(companies.bilanci)}
  + ${nonVuoto(companies.unitaLocali)}
)`;

function presente(colonna: AnyColumn): SQL {
  return sql`case when ${colonna} is not null then 1 else 0 end`;
}

function nonVuoto(colonna: AnyColumn): SQL {
  return sql`case when jsonb_array_length(coalesce(${colonna}, '[]'::jsonb)) > 0
    then 1 else 0 end`;
}

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
  if (filtri.iniziale) {
    // "#" raccoglie tutto ciò che non comincia per lettera
    parti.push(
      filtri.iniziale === "#"
        ? sql`${companies.denominazione} !~* '^[a-z]'`
        : ilike(companies.denominazione, `${filtri.iniziale}%`),
    );
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

/**
 * L'esercizio più recente con un fatturato, estratto dal jsonb dei bilanci.
 *
 * `jsonb_agg ... -> 0` restituisce il primo elemento dopo l'ordinamento per
 * anno decrescente: i bilanci sono pochi per riga, e questo evita di
 * riportarli tutti in JavaScript per poi tenerne uno.
 */
const ultimoBilancio = sql`(
  select jsonb_agg(b order by (b->>'anno')::int desc)
  from jsonb_array_elements(coalesce(${companies.bilanci}, '[]'::jsonb)) b
  where b->>'fatturato' is not null
) -> 0`;

const fatturatoSql = sql<number | null>`(${ultimoBilancio}->>'fatturato')::float8`;
const annoBilancioSql = sql<number | null>`(${ultimoBilancio}->>'anno')::int`;

/** Le aziende con il fatturato più alto fra quelle presenti in archivio. */
export async function inEvidenzaInArchivio(
  db: Database,
  limite = 6,
): Promise<AziendaInEvidenza[]> {
  const righe = await db
    .select({
      partitaIva: companies.partitaIva,
      denominazione: companies.denominazione,
      sede: companies.sede,
      statoAttivita: companies.statoAttivita,
      fatturato: fatturatoSql,
      anno: annoBilancioSql,
    })
    .from(companies)
    .where(sql`${fatturatoSql} is not null`)
    .orderBy(sql`${fatturatoSql} desc`)
    .limit(limite);

  return righe.map((riga) => ({
    ...inSintesi(riga),
    // il driver può restituire i numerici come stringa
    fatturato: riga.fatturato === null ? null : Number(riga.fatturato),
    anno: riga.anno === null ? null : Number(riga.anno),
  }));
}

export async function aggregaInArchivio(
  db: Database,
  filtri: FiltriElenco,
  per: Raggruppamento,
): Promise<VoceAggregata[]> {
  const dove = condizioni(filtri);

  // la regione si ottiene raggruppando per provincia e sommando dopo
  const chiave =
    per === "comune"
      ? comuneSql
      : per === "ateco"
        ? sql<string>`left(${companies.atecoPrimario}, 2)`
        : per === "iniziale"
          ? sql<string>`case when ${companies.denominazione} ~* '^[a-z]'
              then upper(left(${companies.denominazione}, 1)) else '#' end`
          : provinciaSql;

  const righe = await db
    .select({ chiave, quante: count() })
    .from(companies)
    // l'iniziale esiste sempre; le altre chiavi vivono nella sede
    .where(
      per === "iniziale" ? and(...dove) : and(...dove, isNotNull(companies.sede)),
    )
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

/**
 * L'ordine di merito, negli stessi scaglioni di `punteggio()`.
 *
 * Si ordina crescendo, quindi 0 è il risultato migliore. La distinzione che
 * conta è l'ultima: una parola che **apre** una parola del nome vale più di
 * una che capita in mezzo a un'altra — chi cerca "eni" vuole ENI, non THALES
 * ALENIA SPACE.
 */
function rilevanza(nomeRicerca: SQL, parole: string[]): SQL {
  if (parole.length === 0) return sql`0`;

  const unite = parole.join(" ");

  // `\m` è il confine iniziale di parola in Postgres
  const aperture = parole.map(
    (parola) => sql`${nomeRicerca} ~ ${`\\m${escapeRegex(parola)}`}`,
  );

  return sql`case
    when ${nomeRicerca} = ${unite} then 0
    when ${nomeRicerca} like ${`${unite} %`} then 1
    when ${sql.join(aperture, sql` and `)} then 2
    else 3
  end`;
}

/** I nomi contengono punti e parentesi: vanno neutralizzati nel pattern. */
function escapeRegex(testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function cercaInArchivio(
  db: Database,
  query: string,
  opzioni: OpzioniRicerca = {},
): Promise<EsitoRicerca> {
  const { provincia, offset = 0, limite = 20 } = opzioni;

  // Il confronto avviene sulla forma normalizzata — senza accenti, senza
  // punteggiatura, con le sigle ricomposte — perché è la stessa che usa la
  // ricerca in memoria: due strade con regole diverse darebbero all'utente
  // due risposte diverse alla stessa domanda.
  const nomeRicerca = sql`coalesce(${companies.denominazioneRicerca}, lower(${companies.denominazione}))`;

  const parole = chiaveRicerca(query).split(" ").filter(Boolean);

  // ogni parola digitata deve comparire: chi cerca due parole non vuole i
  // risultati che ne contengono una sola
  const dove: SQL[] = parole.map(
    (parola) => sql`${nomeRicerca} like ${`%${parola}%`}`,
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
    // a parità di merito vince il nome più corto: fra "ENI S.P.A." e "ENI
    // GLOBAL ENERGY MARKETS S.P.A." chi ha scritto "eni" cercava la prima
    .orderBy(
      rilevanza(nomeRicerca, parole),
      sql`length(${nomeRicerca})`,
      asc(companies.denominazione),
    )
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
