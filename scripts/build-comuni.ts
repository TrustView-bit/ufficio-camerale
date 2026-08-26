/**
 * Costruisce il dataset dei comuni italiani a partire dai CSV di
 * opendatasicilia/comuni-italiani, che rielabora le fonti Istat in una forma
 * già pulita (codice Istat, comune, provincia, sigla, regione, CAP).
 *
 * Come per l'ATECO: si esegue a mano (`npm run build:comuni`) e il JSON
 * prodotto è versionato, così il build non dipende da GitHub.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FONTE = {
  url: "https://raw.githubusercontent.com/opendatasicilia/comuni-italiani/main/dati/main.csv",
  repository: "https://github.com/opendatasicilia/comuni-italiani",
};

const OUT = fileURLToPath(new URL("../data/comuni.json", import.meta.url));

class ErroreFonte extends Error {}

/** Parser CSV minimo ma corretto sulle virgolette. */
function leggiCsv(testo: string): Record<string, string>[] {
  const righe: string[][] = [];
  let campo = "";
  let riga: string[] = [];
  let dentroVirgolette = false;

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]!;

    if (dentroVirgolette) {
      if (c === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroVirgolette = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') dentroVirgolette = true;
    else if (c === ",") {
      riga.push(campo);
      campo = "";
    } else if (c === "\n") {
      riga.push(campo);
      righe.push(riga);
      riga = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }

  if (campo || riga.length > 0) {
    riga.push(campo);
    righe.push(riga);
  }

  const [intestazioni, ...corpo] = righe;
  if (!intestazioni) throw new ErroreFonte("il CSV è vuoto.");

  return corpo
    .filter((r) => r.length === intestazioni.length)
    .map((r) => Object.fromEntries(intestazioni.map((h, i) => [h, r[i] ?? ""])));
}

/** L'Italia sta tutta dentro questo rettangolo, isole comprese. */
const CONFINI = { latMin: 35.4, latMax: 47.2, lonMin: 6.5, lonMax: 18.7 };

/**
 * Undici righe della sorgente scrivono la coordinata senza punto decimale
 * ("45581" invece di "45.581", "9527" invece di "9.527"). È un errore
 * recuperabile: nessuna coordinata italiana supera 47.2 di latitudine o 18.7
 * di longitudine, quindi il punto va reinserito in un solo modo possibile.
 */
function riparaCoordinata(grezzo: string, min: number, max: number): number | null {
  const valore = Number(grezzo);
  if (!Number.isFinite(valore)) return null;
  if (valore >= min && valore <= max) return valore;

  const cifre = grezzo.replace(/[^\d]/g, "");
  for (let posizione = 1; posizione <= 2; posizione++) {
    const candidato = Number(
      `${cifre.slice(0, posizione)}.${cifre.slice(posizione)}`,
    );
    if (candidato >= min && candidato <= max) return candidato;
  }

  return null;
}

/**
 * Correzioni puntuali a errori della sorgente che non sono riconoscibili in
 * automatico, perché la coordinata è formalmente valida ma sbagliata.
 *
 * Ogni voce va motivata: qui la sorgente colloca Brescia una trentina di
 * chilometri a nord-est del centro città, in Val Trompia.
 */
const CORREZIONI: Record<string, { lat: number; lon: number; perche: string }> = {
  "017029": {
    lat: 45.5416,
    lon: 10.2118,
    perche: "la sorgente indica 45.77958,10.42587: 31 km a nord-est di Brescia",
  },
};

async function main() {
  process.stdout.write("Scarico i comuni… ");

  let risposta: Response;
  try {
    risposta = await fetch(FONTE.url, { signal: AbortSignal.timeout(120_000) });
  } catch (errore) {
    console.error(
      `\n✗ impossibile raggiungere la fonte.\n  URL: ${FONTE.url}\n` +
        `  Causa: ${errore instanceof Error ? errore.message : String(errore)}`,
    );
    process.exit(1);
  }

  if (!risposta.ok) {
    console.error(
      `\n✗ la fonte ha risposto ${risposta.status}.\n  URL: ${FONTE.url}\n` +
        `  Controlla che il file esista ancora su ${FONTE.repository}\n` +
        `  e aggiorna FONTE in scripts/build-comuni.ts.`,
    );
    process.exit(1);
  }

  const testo = await risposta.text();
  console.log(`${(testo.length / 1024).toFixed(0)} kB`);

  const righe = leggiCsv(testo);

  const attese = [
    "comune",
    "pro_com_t",
    "den_prov",
    "sigla",
    "den_reg",
    "cap",
    "lat",
    "long",
  ];
  const mancanti = attese.filter((colonna) => !(colonna in (righe[0] ?? {})));
  if (mancanti.length > 0) {
    console.error(
      `\n✗ mancano le colonne: ${mancanti.join(", ")}\n` +
        `  Trovate: ${Object.keys(righe[0] ?? {}).join(", ")}\n` +
        `  Aggiorna il parser in scripts/build-comuni.ts.`,
    );
    process.exit(1);
  }

  const scartati: string[] = [];
  const riparati: string[] = [];
  const corretti: string[] = [];

  const province: Record<string, { nome: string; regione: string }> = {};
  // [nome, codice Istat, sigla provincia, CAP, latitudine, longitudine]
  const comuni: [string, string, string, string, number, number][] = [];

  for (const riga of righe) {
    const nome = riga.comune?.trim();
    const codiceIstat = riga.pro_com_t?.trim();
    const sigla = riga.sigla?.trim().toUpperCase();
    if (!nome || !codiceIstat || !sigla) continue;

    province[sigla] ??= {
      nome: riga.den_prov?.trim() ?? sigla,
      regione: riga.den_reg?.trim() ?? "",
    };

    // le coordinate sono del centro del comune, non del civico: bastano a
    // centrare una mappa, non a puntare un indirizzo
    const correzione = CORREZIONI[codiceIstat];
    const lat =
      correzione?.lat ??
      riparaCoordinata(riga.lat ?? "", CONFINI.latMin, CONFINI.latMax);
    const lon =
      correzione?.lon ??
      riparaCoordinata(riga.long ?? "", CONFINI.lonMin, CONFINI.lonMax);

    if (lat === null || lon === null) {
      scartati.push(`${nome} (${sigla}): lat=${riga.lat} long=${riga.long}`);
      continue;
    }

    if (correzione) corretti.push(`${nome}: ${correzione.perche}`);
    else if (Number(riga.lat) !== lat || Number(riga.long) !== lon) {
      riparati.push(`${nome}: ${riga.lat},${riga.long} → ${lat},${lon}`);
    }

    comuni.push([
      nome,
      codiceIstat,
      sigla,
      riga.cap?.trim() ?? "",
      Math.round(lat * 1e5) / 1e5,
      Math.round(lon * 1e5) / 1e5,
    ]);
  }

  if (comuni.length < 7000) {
    console.error(
      `\n✗ sono usciti solo ${comuni.length} comuni: in Italia sono circa 7900. ` +
        `Il formato del file è probabilmente cambiato.`,
    );
    process.exit(1);
  }

  comuni.sort((a, b) => a[0].localeCompare(b[0], "it"));

  writeFileSync(
    OUT,
    JSON.stringify({
      fonte: FONTE.url,
      repository: FONTE.repository,
      scaricato: new Date().toISOString().slice(0, 10),
      province,
      comuni,
    }) + "\n",
  );

  console.log(
    `  → data/comuni.json (${comuni.length} comuni, ${Object.keys(province).length} province)`,
  );

  if (riparati.length > 0) {
    console.log(
      `  ${riparati.length} coordinate senza punto decimale, ricostruite:`,
    );
    for (const riga of riparati) console.log(`    · ${riga}`);
  }
  if (corretti.length > 0) {
    console.log(`  ${corretti.length} correzioni manuali applicate:`);
    for (const riga of corretti) console.log(`    · ${riga}`);
  }
  if (scartati.length > 0) {
    console.error(
      `  ⚠ ${scartati.length} comuni scartati per coordinate illeggibili:`,
    );
    for (const riga of scartati) console.error(`    · ${riga}`);
  }
  console.log("\nFatto. Ricordati di committare il file in data/.");
}

void main();
