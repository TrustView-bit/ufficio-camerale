/**
 * Costruisce i dataset ATECO a partire dai file XLSX pubblicati da Istat.
 *
 * Si esegue A MANO (`npm run build:ateco`), non durante il build: i JSON
 * prodotti sono versionati nel repository, così un deploy su Vercel non
 * dipende mai dalla raggiungibilità di istat.it.
 *
 * Istat sposta i file a ogni aggiornamento: se un URL non risponde più, lo
 * script si ferma dicendo esattamente quale indirizzo cercare.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";

const FONTI = {
  struttura: {
    url: "https://www.istat.it/wp-content/uploads/2025/02/StrutturaATECO-2025-IT-EN-DE.xlsx",
    foglio: "ATECO 2025 Struttura",
    pagina: "https://www.istat.it/classificazione/ateco-2025/",
  },
  raccordo: {
    url: "https://www.istat.it/wp-content/uploads/2026/07/Aggiornamento-2026-Tavola-raccordo-bidirezionale-ATECO-2025-ATECO-2022-italiano.xlsx",
    foglio: "ATECO 2025 vs ATECO 2022",
    pagina: "https://www.istat.it/classificazione/ateco-2025/",
  },
} as const;

const OUT_STRUTTURA = fileURLToPath(new URL("../data/ateco.json", import.meta.url));
const OUT_RACCORDO = fileURLToPath(
  new URL("../data/ateco-raccordo.json", import.meta.url),
);

class ErroreFonte extends Error {}

async function scarica(nome: string, url: string, pagina: string): Promise<Buffer> {
  process.stdout.write(`Scarico ${nome}… `);

  let risposta: Response;
  try {
    risposta = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  } catch (errore) {
    throw new ErroreFonte(
      `impossibile raggiungere Istat per «${nome}».\n` +
        `  URL: ${url}\n` +
        `  Causa: ${errore instanceof Error ? errore.message : String(errore)}`,
    );
  }

  if (!risposta.ok) {
    throw new ErroreFonte(
      `Istat ha risposto ${risposta.status} per «${nome}».\n` +
        `  URL: ${url}\n` +
        `  Istat rinomina i file a ogni aggiornamento: cerca il link corrente su\n` +
        `  ${pagina}\n` +
        `  e aggiorna FONTI in scripts/build-ateco.ts.`,
    );
  }

  const buffer = Buffer.from(await risposta.arrayBuffer());
  console.log(`${(buffer.length / 1024).toFixed(0)} kB`);
  return buffer;
}

/** Le celle possono contenere testo semplice o testo formattato a pezzi. */
function testo(valore: ExcelJS.CellValue): string {
  if (valore === null || valore === undefined) return "";
  if (typeof valore === "string") return valore.trim();
  if (typeof valore === "number") return String(valore);
  if (typeof valore === "object" && "richText" in valore) {
    return valore.richText
      .map((pezzo) => pezzo.text)
      .join("")
      .trim();
  }
  if (typeof valore === "object" && "text" in valore) {
    return String(valore.text).trim();
  }
  return String(valore).trim();
}

async function apriFoglio(buffer: Buffer, nomeFoglio: string, fonte: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const foglio = wb.getWorksheet(nomeFoglio);
  if (!foglio) {
    throw new ErroreFonte(
      `il foglio «${nomeFoglio}» non esiste più in ${fonte}.\n` +
        `  Fogli presenti: ${wb.worksheets.map((w) => `«${w.name}»`).join(", ")}\n` +
        `  Aggiorna FONTI in scripts/build-ateco.ts.`,
    );
  }
  return foglio;
}

/** Verifica che le intestazioni siano quelle attese, in quell'ordine. */
function controllaIntestazioni(
  foglio: ExcelJS.Worksheet,
  attese: string[],
  fonte: string,
) {
  const riga = foglio.getRow(1);
  const trovate = attese.map((_, i) => testo(riga.getCell(i + 1).value));

  const diverse = attese.filter((attesa, i) => trovate[i] !== attesa);
  if (diverse.length > 0) {
    throw new ErroreFonte(
      `le colonne di ${fonte} non sono più quelle attese.\n` +
        `  Attese: ${attese.join(", ")}\n` +
        `  Trovate: ${trovate.join(", ")}\n` +
        `  Aggiorna il parser in scripts/build-ateco.ts.`,
    );
  }
}

type VoceAteco = { titolo: string; livello: number; padre: string | null };

async function costruisciStruttura(oggi: string) {
  const buffer = await scarica(
    "struttura ATECO 2025",
    FONTI.struttura.url,
    FONTI.struttura.pagina,
  );
  const foglio = await apriFoglio(
    buffer,
    FONTI.struttura.foglio,
    "StrutturaATECO-2025",
  );

  controllaIntestazioni(
    foglio,
    [
      "ORDINE_CODICE_ATECO_2025",
      "CODICE_ATECO_2025",
      "TITOLO_ITALIANO_ATECO_2025",
      "TITOLO_INGLESE_ATECO_2025",
      "TITOLO_TEDESCO_ATECO_2025",
      "GERARCHIA_ATECO_2025",
      "CODICE_PADRE_ATECO_2025",
    ],
    "StrutturaATECO-2025",
  );

  const voci: Record<string, VoceAteco> = {};

  foglio.eachRow((riga, numero) => {
    if (numero === 1) return;

    const codice = testo(riga.getCell(2).value);
    const titolo = testo(riga.getCell(3).value);
    const livello = Number(testo(riga.getCell(6).value));
    const padre = testo(riga.getCell(7).value);

    if (!codice || !titolo || !Number.isFinite(livello)) return;

    voci[codice] = {
      titolo: normalizzaTitolo(titolo),
      livello,
      padre: padre || null,
    };
  });

  if (Object.keys(voci).length < 1000) {
    throw new ErroreFonte(
      `dalla struttura sono uscite solo ${Object.keys(voci).length} voci: ` +
        `troppo poche, il formato del file è probabilmente cambiato.`,
    );
  }

  const dati = {
    versione: "ATECO 2025",
    fonte: FONTI.struttura.url,
    scaricato: oggi,
    voci,
  };

  writeFileSync(OUT_STRUTTURA, JSON.stringify(dati) + "\n");
  console.log(`  → data/ateco.json (${Object.keys(voci).length} voci)`);
}

/**
 * Istat scrive i titoli dei livelli alti tutti in maiuscolo
 * ("AGRICOLTURA, SILVICOLTURA E PESCA"): illeggibili in una scheda.
 */
export function normalizzaTitolo(titolo: string): string {
  const pulito = titolo.replace(/\s+/g, " ").trim();

  const lettere = pulito.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  const maiuscole = lettere.replace(/[^A-ZÀ-ÖØ-Þ]/g, "").length;
  const tuttoMaiuscolo = lettere.length > 0 && maiuscole / lettere.length > 0.9;

  if (!tuttoMaiuscolo) return pulito;

  // prima lettera maiuscola, il resto minuscolo, ma le sigle note restano
  const minuscolo = pulito.toLocaleLowerCase("it-IT");
  return minuscolo.charAt(0).toLocaleUpperCase("it-IT") + minuscolo.slice(1);
}

async function costruisciRaccordo(oggi: string) {
  const buffer = await scarica(
    "raccordo ATECO 2025↔2022",
    FONTI.raccordo.url,
    FONTI.raccordo.pagina,
  );
  const foglio = await apriFoglio(
    buffer,
    FONTI.raccordo.foglio,
    "Tavola raccordo bidirezionale",
  );

  controllaIntestazioni(
    foglio,
    [
      "ORDINE_CODICE_ATECO_2025",
      "CODICE_ATECO_2025",
      "TITOLO_ITALIANO_ATECO_2025",
      "COPERTURA_ATECO_2025",
      "ORDINE_CODICE_ATECO_2022",
      "CODICE_ATECO_2022",
    ],
    "Tavola raccordo bidirezionale",
  );

  // La corrispondenza è n:m in entrambe le direzioni: un codice 2022 può
  // finire in più codici 2025 e viceversa.
  const da2022a2025: Record<string, string[]> = {};
  const da2025a2022: Record<string, string[]> = {};

  foglio.eachRow((riga, numero) => {
    if (numero === 1) return;

    const c2025 = testo(riga.getCell(2).value);
    const c2022 = testo(riga.getCell(6).value);
    if (!c2025 || !c2022) return;

    (da2022a2025[c2022] ??= []).push(c2025);
    (da2025a2022[c2025] ??= []).push(c2022);
  });

  for (const mappa of [da2022a2025, da2025a2022]) {
    for (const chiave of Object.keys(mappa)) {
      mappa[chiave] = [...new Set(mappa[chiave])].sort();
    }
  }

  if (Object.keys(da2022a2025).length < 1000) {
    throw new ErroreFonte(
      `dal raccordo sono usciti solo ${Object.keys(da2022a2025).length} codici 2022: ` +
        `troppo pochi, il formato del file è probabilmente cambiato.`,
    );
  }

  const dati = {
    fonte: FONTI.raccordo.url,
    scaricato: oggi,
    da2022a2025,
    da2025a2022,
  };

  writeFileSync(OUT_RACCORDO, JSON.stringify(dati) + "\n");

  const ambigui = Object.values(da2022a2025).filter((v) => v.length > 1).length;
  console.log(
    `  → data/ateco-raccordo.json (${Object.keys(da2022a2025).length} codici 2022, ` +
      `di cui ${ambigui} con più corrispondenze)`,
  );
}

async function main() {
  const oggi = new Date().toISOString().slice(0, 10);

  try {
    await costruisciStruttura(oggi);
    await costruisciRaccordo(oggi);
  } catch (errore) {
    if (errore instanceof ErroreFonte) {
      console.error(`\n✗ Build ATECO fallita: ${errore.message}\n`);
      process.exit(1);
    }
    throw errore;
  }

  console.log("\nFatto. Ricordati di committare i file in data/.");
}

void main();
