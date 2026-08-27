/**
 * Importazione di un archivio di imprese.
 *
 *   npm run import -- --fonte=telemaco-indirizzi --file=./data/lombardia-01.csv
 *
 * Opzioni:
 *   --fonte=<nome>     obbligatoria, vedi l'elenco stampato senza argomenti
 *   --file=<percorso>  obbligatoria
 *   --data=<ISO>       data di acquisizione del dato (default: oggi)
 *   --blocco=<n>       righe per transazione (default 1000)
 *   --riprendi         riparte dal punto in cui si era interrotto
 *   --prova            valida senza scrivere nulla in archivio
 *
 * Le righe non valide non bloccano l'importazione: finiscono in
 * `scarti-<fonte>-<data>.csv` con il motivo, e il riepilogo finale dice
 * quante ne sono state scartate e perché.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

import {
  ADAPTERS,
  FONTI_DISPONIBILI,
  TracciatoSconosciuto,
} from "@/lib/import/adapters";
import { applicaBlocco } from "@/lib/import/motore";
import {
  aBlocchi,
  contaMotivi,
  rigaCsv,
  RIEPILOGO_VUOTO,
  validaBlocco,
  type Riepilogo,
  type Scarto,
} from "@/lib/import/esegui";

const CARTELLA_SCARTI = "scarti";
const CARTELLA_STATO = ".import";

function argomento(nome: string): string | null {
  const trovato = process.argv.find((valore) => valore.startsWith(`--${nome}=`));
  return trovato ? trovato.slice(nome.length + 3) : null;
}

const presente = (nome: string) => process.argv.includes(`--${nome}`);

function istruzioni(): never {
  console.log(
    `\nUso: npm run import -- --fonte=<nome> --file=<percorso>\n\n` +
      `Fonti disponibili:\n` +
      FONTI_DISPONIBILI.map((fonte) => `  • ${fonte}`).join("\n") +
      `\n\nAltre opzioni: --data=<ISO> --blocco=<n> --riprendi --prova\n`,
  );
  process.exit(1);
}

/** Punto raggiunto, per poter riprendere un file interrotto a metà. */
function percorsoStato(fonte: string, file: string): string {
  return join(CARTELLA_STATO, `${fonte}-${basename(file)}.json`);
}

function leggiStato(percorso: string): number {
  if (!existsSync(percorso)) return 0;
  try {
    return Number(JSON.parse(readFileSync(percorso, "utf8")).blocchiFatti) || 0;
  } catch {
    return 0;
  }
}

function scriviStato(percorso: string, blocchiFatti: number, totale: number) {
  mkdirSync(CARTELLA_STATO, { recursive: true });
  writeFileSync(percorso, JSON.stringify({ blocchiFatti, totale }, null, 1));
}

function stampaRiepilogo(
  riepilogo: Riepilogo,
  fonte: string,
  scarti: string | null,
) {
  const riga = (etichetta: string, valore: number) =>
    console.log(`  ${etichetta.padEnd(22)} ${String(valore).padStart(8)}`);

  console.log(`\nRiepilogo importazione «${fonte}»`);
  riga("righe lette", riepilogo.lette);
  riga("righe valide", riepilogo.valide);
  riga("imprese inserite", riepilogo.inserite);
  riga("imprese aggiornate", riepilogo.aggiornate);
  riga("già aggiornate", riepilogo.invariate);
  riga("righe scartate", riepilogo.scartate);

  const motivi = Object.entries(riepilogo.motivi).sort((a, b) => b[1] - a[1]);
  if (motivi.length > 0) {
    console.log("\n  Motivi degli scarti:");
    for (const [motivo, quante] of motivi) {
      console.log(`    ${String(quante).padStart(7)} × ${motivo}`);
    }
  }

  if (scarti) console.log(`\n  Righe scartate salvate in ${scarti}`);
}

async function main() {
  const fonte = argomento("fonte");
  const file = argomento("file");

  if (!fonte || !file) istruzioni();

  const adapter = ADAPTERS[fonte];
  if (!adapter) {
    console.error(`✗ fonte sconosciuta: «${fonte}»`);
    istruzioni();
  }

  if (!existsSync(file)) {
    console.error(`✗ file non trovato: ${file}`);
    process.exit(1);
  }

  const dataAcquisizione = argomento("data") ?? new Date().toISOString();
  const dimensioneBlocco = Number(argomento("blocco")) || 1000;
  const prova = presente("prova");

  console.log(`Leggo ${file} come «${fonte}»…`);

  let grezze: unknown[];
  try {
    grezze = adapter(readFileSync(file), dataAcquisizione);
  } catch (errore) {
    if (errore instanceof TracciatoSconosciuto) {
      console.error(`\n✗ ${errore.message}\n`);
      process.exit(1);
    }
    throw errore;
  }

  console.log(`  ${grezze.length} righe lette dal file`);

  const blocchi = aBlocchi(grezze, dimensioneBlocco);
  const stato = percorsoStato(fonte, file);
  const daSaltare = presente("riprendi") ? leggiStato(stato) : 0;

  if (daSaltare >= blocchi.length && blocchi.length > 0) {
    console.log(
      `\n  Questo file risulta già importato per intero ` +
        `(${blocchi.length}/${blocchi.length} blocchi).\n` +
        `  Rilancia senza --riprendi per rifarlo da capo: l'importazione è ` +
        `idempotente e non produrrà duplicati.\n`,
    );
    return;
  }

  if (daSaltare > 0) {
    console.log(`  riprendo dal blocco ${daSaltare + 1} di ${blocchi.length}`);
  }

  const riepilogo: Riepilogo = { ...RIEPILOGO_VUOTO, motivi: {} };
  riepilogo.lette = grezze.length;

  const tuttiGliScarti: Scarto[] = [];

  // il database si carica solo se serve davvero scrivere
  const db = prova ? null : (await import("@/lib/db")).getDb();
  if (!prova && !db) {
    console.error(
      "\n✗ DATABASE_URL non è configurata: senza archivio non c'è dove importare.\n" +
        "  Usa --prova per validare il file senza scrivere.\n",
    );
    process.exit(1);
  }

  for (const [indice, blocco] of blocchi.entries()) {
    if (indice < daSaltare) continue;

    const primaRiga = indice * dimensioneBlocco + 1;
    const { imprese, scarti } = validaBlocco(blocco, primaRiga);

    riepilogo.valide += imprese.length;
    riepilogo.scartate += scarti.length;
    tuttiGliScarti.push(...scarti);

    if (db) {
      const archivio: NonNullable<typeof db> = db;
      // una transazione per blocco quando il driver la offre: il driver HTTP
      // di Neon non le supporta, ma l'importazione è idempotente e rieseguire
      // il blocco non fa danni
      const conTransazione = archivio as unknown as {
        transaction?: (
          azione: (tx: typeof archivio) => Promise<unknown>,
        ) => Promise<unknown>;
      };

      const applica = async (destinazione: typeof archivio) => {
        const esito = await applicaBlocco(destinazione, imprese);
        riepilogo.inserite += esito.inserita;
        riepilogo.aggiornate += esito.aggiornata;
        riepilogo.invariate += esito.invariata;
      };

      if (typeof conTransazione.transaction === "function") {
        await conTransazione.transaction(applica);
      } else {
        await applica(archivio);
      }
    }

    scriviStato(stato, indice + 1, blocchi.length);

    const fatte = Math.min((indice + 1) * dimensioneBlocco, grezze.length);
    process.stdout.write(`\r  ${fatte}/${grezze.length} righe…`);
  }

  process.stdout.write("\r");

  riepilogo.motivi = contaMotivi(tuttiGliScarti);

  let fileScarti: string | null = null;
  if (tuttiGliScarti.length > 0) {
    mkdirSync(CARTELLA_SCARTI, { recursive: true });
    fileScarti = join(
      CARTELLA_SCARTI,
      `scarti-${fonte}-${dataAcquisizione.slice(0, 10)}.csv`,
    );

    writeFileSync(
      fileScarti,
      [
        rigaCsv(["riga", "motivo", "contenuto"]),
        ...tuttiGliScarti.map((scarto) =>
          rigaCsv([scarto.indice, scarto.motivo, JSON.stringify(scarto.riga)]),
        ),
      ].join("\n") + "\n",
    );
  }

  stampaRiepilogo(riepilogo, fonte, fileScarti);

  // il file è andato fino in fondo: il segnaposto di ripresa non serve più
  if (existsSync(stato)) rmSync(stato);

  if (prova) console.log("\n  (prova: non è stato scritto nulla in archivio)");
}

void main();
