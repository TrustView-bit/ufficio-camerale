/**
 * Converte un foglio di un file XLSX in TSV, per darlo in pasto a
 * `estrai-imprese.py tabella`.
 *
 *   npx tsx scripts/xlsx-in-tsv.ts <file.xlsx> [foglio] > dati.tsv
 *
 * Fa una cosa sola: legge le celle e le scrive separate da tabulazione,
 * senza interpretare nulla. Le tabulazioni e gli a capo dentro una cella
 * diventano spazi, perché nel TSV separerebbero i campi.
 */

import ExcelJS from "exceljs";

function testo(valore: ExcelJS.CellValue): string {
  if (valore === null || valore === undefined) return "";

  if (typeof valore === "object") {
    if ("richText" in valore) {
      return valore.richText.map((pezzo) => pezzo.text).join("");
    }
    // le celle con formula portano il risultato accanto alla formula
    if ("result" in valore) return String(valore.result ?? "");
    if ("text" in valore) return String(valore.text);
    if (valore instanceof Date) return valore.toISOString().slice(0, 10);
  }

  return String(valore);
}

async function main() {
  const [percorso, nomeFoglio] = process.argv.slice(2);

  if (!percorso) {
    console.error("Uso: npx tsx scripts/xlsx-in-tsv.ts <file.xlsx> [foglio]");
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(percorso);

  const foglio = nomeFoglio ? wb.getWorksheet(nomeFoglio) : wb.worksheets[0];
  if (!foglio) {
    console.error(
      `✗ foglio non trovato.\n  Fogli presenti: ${wb.worksheets
        .map((w) => `«${w.name}»`)
        .join(", ")}`,
    );
    process.exit(1);
  }

  const righe: string[] = [];

  foglio.eachRow((riga) => {
    const celle: string[] = [];
    for (let c = 1; c <= foglio.columnCount; c++) {
      celle.push(
        testo(riga.getCell(c).value)
          .replace(/[\t\r\n]+/g, " ")
          .trim(),
      );
    }
    if (celle.some((cella) => cella !== "")) righe.push(celle.join("\t"));
  });

  process.stdout.write(righe.join("\n") + "\n");
}

void main();
