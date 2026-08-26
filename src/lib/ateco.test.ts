import { describe, expect, it } from "vitest";

import {
  antenatoComune,
  codici2022Di,
  descriviAteco,
  normalizzaCodiceAteco,
} from "./ateco";

describe("normalizzaCodiceAteco", () => {
  it("riporta alla forma puntata di Istat", () => {
    expect(normalizzaCodiceAteco("621000")).toBe("62.10.00");
    expect(normalizzaCodiceAteco("62.10.00")).toBe("62.10.00");
    expect(normalizzaCodiceAteco(" 62-10-00 ")).toBe("62.10.00");
    expect(normalizzaCodiceAteco("6210")).toBe("62.10");
    expect(normalizzaCodiceAteco("62")).toBe("62");
  });

  it("accetta le sezioni, che sono lettere", () => {
    expect(normalizzaCodiceAteco("j")).toBe("J");
  });

  it("rifiuta ciò che non è un codice", () => {
    expect(normalizzaCodiceAteco("")).toBeNull();
    expect(normalizzaCodiceAteco("6")).toBeNull();
    expect(normalizzaCodiceAteco("1234567")).toBeNull();
    expect(normalizzaCodiceAteco("non un codice")).toBeNull();
  });
});

describe("descriviAteco — codici già ATECO 2025", () => {
  it("risolve una sottocategoria in modo esatto", () => {
    const risultato = descriviAteco("62.10.00");

    expect(risultato).toEqual({
      codice: "62.10.00",
      descrizione: "Attività di programmazione informatica",
      livello: 6,
      versioneRisolta: "2025",
      esatta: true,
    });
  });

  it("risolve una divisione e una sezione", () => {
    expect(descriviAteco("62")).toMatchObject({ livello: 2, esatta: true });
    expect(descriviAteco("A")).toMatchObject({
      descrizione: "Agricoltura, silvicoltura e pesca",
      livello: 1,
      esatta: true,
    });
  });

  it("accetta il codice senza punti, come lo mandano certi fornitori", () => {
    expect(descriviAteco("621000")).toMatchObject({
      codice: "62.10.00",
      esatta: true,
    });
  });
});

describe("descriviAteco — codici ATECO 2022 da convertire", () => {
  // 62.01.00 esiste solo nella classificazione 2022: in ATECO 2025 la
  // programmazione informatica è 62.10.00
  it("converte un codice 2022 con una sola corrispondenza", () => {
    const risultato = descriviAteco("62.01.00", "2022");

    expect(risultato).toEqual({
      codice: "62.10.00",
      descrizione: "Attività di programmazione informatica",
      livello: 6,
      versioneRisolta: "2022",
      esatta: true,
    });
  });

  it("converte anche senza sapere la versione, perché in 2025 non esiste", () => {
    expect(descriviAteco("62.01.00")).toMatchObject({
      codice: "62.10.00",
      versioneRisolta: "2022",
      esatta: true,
    });
  });

  it("con versione 2022 dichiarata usa il raccordo, non la tabella 2025", () => {
    // 01.13.30 esiste in entrambe le classificazioni, ma vuol dire cose
    // diverse: dichiarare la versione cambia davvero la risposta
    const come2025 = descriviAteco("01.13.30", "2025");
    const come2022 = descriviAteco("01.13.30", "2022");

    expect(come2025).toMatchObject({
      codice: "01.13.30",
      versioneRisolta: "2025",
      esatta: true,
    });
    expect(come2022).toMatchObject({
      codice: "01.13.20",
      versioneRisolta: "2022",
      esatta: true,
    });
    expect(come2022?.descrizione).not.toBe(come2025?.descrizione);
  });
});

describe("descriviAteco — conversioni ambigue", () => {
  it("risale al livello condiviso invece di scegliere il primo risultato", () => {
    // 01.13.10 del 2022 si divide in 01.13.11 e 01.13.20 nel 2025
    const risultato = descriviAteco("01.13.10", "2022");

    expect(risultato?.esatta).toBe(false);
    expect(risultato?.codice).toBe("01.13");
    expect(risultato?.livello).toBe(4);
  });

  it("un codice ambiguo non restituisce mai una delle alternative", () => {
    const risultato = descriviAteco("13", "2022");

    expect(risultato?.esatta).toBe(false);
    // 13 del 2022 finisce in 13, 18 e 23: nessuno dei tre va scelto
    expect(["13", "18", "23"]).not.toContain(risultato?.codice);
  });
});

describe("descriviAteco — troncamento gerarchico", () => {
  it("accorcia il codice finché qualcosa combacia", () => {
    // sottocategoria inventata dentro una classe che esiste: si sale alla
    // classe, non si sceglie una sottocategoria a caso
    const risultato = descriviAteco("62.10.99");

    expect(risultato?.esatta).toBe(false);
    expect(risultato?.codice).toBe("62.10");
    expect(risultato?.livello).toBe(4);
  });

  it("segnala sempre che la descrizione è approssimata", () => {
    expect(descriviAteco("62.99.99")?.esatta).toBe(false);
  });
});

describe("descriviAteco — codici inesistenti", () => {
  it("restituisce null, non una descrizione plausibile", () => {
    // la divisione 04 non esiste in ATECO 2025
    expect(descriviAteco("04.99.99")).toBeNull();
    expect(descriviAteco("04")).toBeNull();
  });

  it("restituisce null su input non interpretabili", () => {
    expect(descriviAteco("")).toBeNull();
    expect(descriviAteco("non un codice")).toBeNull();
    expect(descriviAteco("ZZ")).toBeNull();
  });
});

describe("antenatoComune", () => {
  it("trova il livello condiviso più profondo", () => {
    expect(antenatoComune(["01.13.11", "01.13.20"])).toBe("01.13");
    expect(antenatoComune(["62.10.00", "62.20.10"])).toBe("62");
  });

  it("con un solo codice restituisce quel codice", () => {
    expect(antenatoComune(["62.10.00"])).toBe("62.10.00");
  });

  it("restituisce null se non c'è nulla di condiviso o di noto", () => {
    expect(antenatoComune([])).toBeNull();
    expect(antenatoComune(["inesistente"])).toBeNull();
  });
});

describe("codici2022Di", () => {
  it("percorre il raccordo nella direzione opposta", () => {
    expect(codici2022Di("62.10.00")).toContain("62.01.00");
  });

  it("restituisce un elenco vuoto per un codice sconosciuto", () => {
    expect(codici2022Di("04.99.99")).toEqual([]);
  });
});
