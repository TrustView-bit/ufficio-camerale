import { describe, expect, it } from "vitest";

import {
  colonna,
  decodifica,
  leggiCsv,
  numeroItaliano,
  rilevaSeparatore,
} from "./csv";

describe("decodifica", () => {
  it("legge un file UTF-8", () => {
    const esito = decodifica(Buffer.from("Società à è ì", "utf8"));
    expect(esito.codifica).toBe("utf-8");
    expect(esito.testo).toBe("Società à è ì");
  });

  it("riconosce ISO-8859-1 invece di storpiarlo", () => {
    // i CSV di Telemaco sono in questa codifica, non in UTF-8
    const esito = decodifica(Buffer.from("Societ\xE0 pi\xF9 citt\xE0", "latin1"));
    expect(esito.codifica).toBe("windows-1252");
    expect(esito.testo).toBe("Società più città");
  });

  it("toglie il BOM che Excel mette in testa", () => {
    const esito = decodifica(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("nome", "utf8")]),
    );
    expect(esito.testo).toBe("nome");
  });
});

describe("rilevaSeparatore", () => {
  it("preferisce il punto e virgola dei CSV italiani", () => {
    expect(rilevaSeparatore("denominazione;partita_iva;comune")).toBe(";");
  });

  it("riconosce comunque la virgola", () => {
    expect(rilevaSeparatore("denominazione,partita_iva,comune")).toBe(",");
  });
});

describe("leggiCsv", () => {
  it("legge un file con punto e virgola e accenti latin-1", () => {
    const contenuto = Buffer.from(
      "denominazione;partita_iva;comune\nSociet\xE0 Esempio;00743110157;Milano\n",
      "latin1",
    );
    const { righe, codifica, separatore } = leggiCsv(contenuto);

    expect(codifica).toBe("windows-1252");
    expect(separatore).toBe(";");
    expect(righe).toHaveLength(1);
    expect(righe[0]!.denominazione).toBe("Società Esempio");
  });

  it("regge virgolette e separatori dentro i campi", () => {
    const contenuto = Buffer.from(
      'denominazione;partita_iva\n"ROSSI ""MARIO""; & FIGLI SNC";00743110157\n',
      "utf8",
    );
    const { righe } = leggiCsv(contenuto);

    expect(righe[0]!.denominazione).toBe('ROSSI "MARIO"; & FIGLI SNC');
  });

  it("salta le righe completamente vuote", () => {
    const contenuto = Buffer.from("a;b\n1;2\n\n;\n3;4\n", "utf8");
    expect(leggiCsv(contenuto).righe).toHaveLength(2);
  });
});

describe("colonna", () => {
  const riga = { "Partita IVA": "00743110157", CAP: "04020", "": "" };

  it("trova la colonna ignorando spazi, accenti e maiuscole", () => {
    expect(colonna(riga, "partitaiva")).toBe("00743110157");
    expect(colonna(riga, "PARTITA_IVA")).toBe("00743110157");
  });

  it("prova più nomi possibili nell'ordine dato", () => {
    expect(colonna(riga, "piva", "partitaiva")).toBe("00743110157");
  });

  it("restituisce null se nessun nome corrisponde", () => {
    expect(colonna(riga, "inesistente")).toBeNull();
  });
});

describe("numeroItaliano", () => {
  it("legge i numeri all'italiana", () => {
    expect(numeroItaliano("1.234,56")).toBe(1234.56);
    expect(numeroItaliano("10.000")).toBe(10000);
    expect(numeroItaliano("50000")).toBe(50000);
  });

  it("legge anche quelli all'inglese", () => {
    expect(numeroItaliano("1,234.56")).toBe(1234.56);
  });

  it("ignora simboli di valuta e spazi", () => {
    expect(numeroItaliano("€ 2.500.000,00")).toBe(2500000);
  });

  it("restituisce null su valori non numerici", () => {
    expect(numeroItaliano(null)).toBeNull();
    expect(numeroItaliano("")).toBeNull();
    expect(numeroItaliano("n.d.")).toBeNull();
  });
});

describe("numeroItaliano — la regola dei tre decimali", () => {
  it("con un segno solo e tre cifre dopo, sono migliaia", () => {
    expect(numeroItaliano("10.000")).toBe(10000);
    expect(numeroItaliano("1.500")).toBe(1500);
    expect(numeroItaliano("2,500")).toBe(2500);
  });

  it("con un numero diverso di cifre è un decimale", () => {
    expect(numeroItaliano("10,5")).toBe(10.5);
    expect(numeroItaliano("10.50")).toBe(10.5);
    expect(numeroItaliano("0,25")).toBe(0.25);
  });

  it("con entrambi i segni decide l'ultimo", () => {
    expect(numeroItaliano("1.234.567,89")).toBe(1234567.89);
    expect(numeroItaliano("1,234,567.89")).toBe(1234567.89);
  });
});
