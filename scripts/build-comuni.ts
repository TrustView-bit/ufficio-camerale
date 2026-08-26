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

  const attese = ["comune", "pro_com_t", "den_prov", "sigla", "den_reg", "cap"];
  const mancanti = attese.filter((colonna) => !(colonna in (righe[0] ?? {})));
  if (mancanti.length > 0) {
    console.error(
      `\n✗ mancano le colonne: ${mancanti.join(", ")}\n` +
        `  Trovate: ${Object.keys(righe[0] ?? {}).join(", ")}\n` +
        `  Aggiorna il parser in scripts/build-comuni.ts.`,
    );
    process.exit(1);
  }

  const province: Record<string, { nome: string; regione: string }> = {};
  const comuni: [string, string, string, string][] = [];

  for (const riga of righe) {
    const nome = riga.comune?.trim();
    const codiceIstat = riga.pro_com_t?.trim();
    const sigla = riga.sigla?.trim().toUpperCase();
    if (!nome || !codiceIstat || !sigla) continue;

    province[sigla] ??= {
      nome: riga.den_prov?.trim() ?? sigla,
      regione: riga.den_reg?.trim() ?? "",
    };

    comuni.push([nome, codiceIstat, sigla, riga.cap?.trim() ?? ""]);
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
  console.log("\nFatto. Ricordati di committare il file in data/.");
}

void main();
