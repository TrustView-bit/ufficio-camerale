/**
 * Lettura di CSV reali, cioè imperfetti.
 *
 * Due cose che i file veri fanno e che un parser ingenuo sbaglia: sono spesso
 * in ISO-8859-1 invece che in UTF-8 (i CSV di Telemaco lo sono), e usano il
 * punto e virgola come separatore perché in Italia la virgola è il separatore
 * decimale.
 */

/**
 * Decodifica il contenuto indovinando la codifica invece di assumerla.
 *
 * Si prova UTF-8 in modo severo: se il file non è UTF-8 valido la decodifica
 * fallisce, e allora è quasi certamente windows-1252 — sovrainsieme di
 * ISO-8859-1 che copre anche le virgolette tipografiche di Excel.
 */
export function decodifica(contenuto: Buffer | Uint8Array): {
  testo: string;
  codifica: "utf-8" | "windows-1252";
} {
  const bytes = contenuto instanceof Buffer ? contenuto : Buffer.from(contenuto);

  // il BOM toglie ogni dubbio
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return { testo: bytes.subarray(3).toString("utf8"), codifica: "utf-8" };
  }

  try {
    const testo = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { testo, codifica: "utf-8" };
  } catch {
    return {
      testo: new TextDecoder("windows-1252").decode(bytes),
      codifica: "windows-1252",
    };
  }
}

/** Il separatore più frequente nella prima riga vince. */
export function rilevaSeparatore(intestazione: string): string {
  const candidati = [";", ",", "\t", "|"];

  let migliore = ";";
  let massimo = -1;

  for (const candidato of candidati) {
    const quante = intestazione.split(candidato).length - 1;
    if (quante > massimo) {
      massimo = quante;
      migliore = candidato;
    }
  }

  return migliore;
}

/** Parser CSV con gestione corretta di virgolette e a capo dentro i campi. */
export function leggiCsv(contenuto: Buffer | Uint8Array): {
  righe: Record<string, string>[];
  codifica: string;
  separatore: string;
} {
  const { testo, codifica } = decodifica(contenuto);

  const primaRiga = testo.slice(0, testo.search(/\r?\n/) + 1 || undefined);
  const separatore = rilevaSeparatore(primaRiga);

  const tabella: string[][] = [];
  let campo = "";
  let riga: string[] = [];
  let dentroVirgolette = false;

  for (let i = 0; i < testo.length; i++) {
    const carattere = testo[i]!;

    if (dentroVirgolette) {
      if (carattere === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroVirgolette = false;
        }
      } else {
        campo += carattere;
      }
      continue;
    }

    if (carattere === '"') dentroVirgolette = true;
    else if (carattere === separatore) {
      riga.push(campo);
      campo = "";
    } else if (carattere === "\n") {
      riga.push(campo);
      tabella.push(riga);
      riga = [];
      campo = "";
    } else if (carattere !== "\r") {
      campo += carattere;
    }
  }

  if (campo !== "" || riga.length > 0) {
    riga.push(campo);
    tabella.push(riga);
  }

  const [intestazioni, ...corpo] = tabella;
  if (!intestazioni) return { righe: [], codifica, separatore };

  const nomi = intestazioni.map((nome) => nome.trim());

  const righe = corpo
    .filter((valori) => valori.some((valore) => valore.trim() !== ""))
    .map((valori) =>
      Object.fromEntries(nomi.map((nome, i) => [nome, (valori[i] ?? "").trim()])),
    );

  return { righe, codifica, separatore };
}

/** Confronta i nomi di colonna ignorando accenti, spazi e maiuscole. */
export function chiaveColonna(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Cerca una colonna fra più nomi possibili: gli elenchi cambiano intestazione
 * fra una versione e l'altra, e fra un fornitore e l'altro.
 */
export function colonna(
  riga: Record<string, string>,
  ...nomiPossibili: string[]
): string | null {
  const indice = new Map(
    Object.entries(riga).map(([nome, valore]) => [chiaveColonna(nome), valore]),
  );

  for (const nome of nomiPossibili) {
    const valore = indice.get(chiaveColonna(nome));
    if (valore !== undefined && valore.trim() !== "") return valore.trim();
  }

  return null;
}

/** Numero all'italiana: "1.234,56" → 1234.56. */
export function numeroItaliano(valore: string | null): number | null {
  if (!valore) return null;

  const pulito = valore.replace(/[^\d,.-]/g, "");
  if (!pulito) return null;

  // se ci sono entrambi i segni, l'ultimo è il separatore decimale
  const ultimaVirgola = pulito.lastIndexOf(",");
  const ultimoPunto = pulito.lastIndexOf(".");

  let normalizzato: string;

  if (ultimaVirgola !== -1 && ultimoPunto !== -1) {
    normalizzato =
      ultimaVirgola > ultimoPunto
        ? pulito.replace(/\./g, "").replace(",", ".")
        : pulito.replace(/,/g, "");
  } else if (ultimaVirgola !== -1 || ultimoPunto !== -1) {
    // Un segno solo è ambiguo: "10.000" può essere diecimila o dieci. Vale la
    // regola dei tre decimali — se dopo il segno ci sono esattamente tre
    // cifre è un separatore delle migliaia, perché gli importi con tre
    // decimali sono rarissimi e le migliaia sono ovunque.
    const segno = ultimaVirgola !== -1 ? "," : ".";
    const dopo = pulito.length - pulito.lastIndexOf(segno) - 1;

    normalizzato =
      dopo === 3 ? pulito.split(segno).join("") : pulito.replace(segno, ".");
  } else {
    normalizzato = pulito;
  }

  const numero = Number(normalizzato);
  return Number.isFinite(numero) ? numero : null;
}
