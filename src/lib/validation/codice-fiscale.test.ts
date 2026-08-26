import { describe, expect, it } from "vitest";

import {
  codiceFiscaleCheckChar,
  hasCodiceFiscaleFormat,
  isValidCodiceFiscale,
  isValidCodiceFiscaleAzienda,
  isValidCodiceFiscalePersona,
  normalizeCodiceFiscale,
  unscrambleOmocodia,
} from "./codice-fiscale";

const CF = "MRTMTT25D09F205Z";
/** Lo stesso codice con l'ultima cifra sostituita per omocodia (5 → R). */
const CF_OMOCODICO = "MRTMTT25D09F20RU";

describe("normalizeCodiceFiscale", () => {
  it("porta in maiuscolo e toglie spazi e punteggiatura", () => {
    expect(normalizeCodiceFiscale(" mrt mtt.25-d09f205z ")).toBe(CF);
  });
});

describe("hasCodiceFiscaleFormat", () => {
  it("accetta la struttura di un CF di persona fisica", () => {
    expect(hasCodiceFiscaleFormat(CF)).toBe(true);
    expect(hasCodiceFiscaleFormat(CF_OMOCODICO)).toBe(true);
  });

  it("rifiuta una lettera di mese inesistente", () => {
    // 'F' non è fra i codici mese ammessi (ABCDEHLMPRST)
    expect(hasCodiceFiscaleFormat("MRTMTT25F09F205Z")).toBe(false);
  });

  it("rifiuta lunghezze diverse da 16", () => {
    expect(hasCodiceFiscaleFormat("MRTMTT25D09F205")).toBe(false);
    expect(hasCodiceFiscaleFormat("MRTMTT25D09F205ZZ")).toBe(false);
  });

  it("rifiuta cifre dove servono lettere", () => {
    expect(hasCodiceFiscaleFormat("MRTMT125D09F205Z")).toBe(false);
  });
});

describe("codiceFiscaleCheckChar", () => {
  it("calcola il carattere di controllo", () => {
    expect(codiceFiscaleCheckChar(CF.slice(0, 15))).toBe("Z");
    expect(codiceFiscaleCheckChar(CF_OMOCODICO.slice(0, 15))).toBe("U");
  });

  it("restituisce null se l'input non ha 15 caratteri alfanumerici", () => {
    expect(codiceFiscaleCheckChar("MRTMTT25D09F20")).toBeNull();
    expect(codiceFiscaleCheckChar("MRTMTT25D09F20-")).toBeNull();
  });

  it("produce sempre una lettera maiuscola", () => {
    const check = codiceFiscaleCheckChar("AAAAAA00A00A000")!;
    expect(check).toMatch(/^[A-Z]$/);
  });
});

describe("isValidCodiceFiscalePersona", () => {
  it("accetta un CF valido", () => {
    expect(isValidCodiceFiscalePersona(CF)).toBe(true);
  });

  it("accetta un CF omocodico valido", () => {
    expect(isValidCodiceFiscalePersona(CF_OMOCODICO)).toBe(true);
  });

  it("rifiuta un carattere di controllo sbagliato", () => {
    expect(isValidCodiceFiscalePersona("MRTMTT25D09F205A")).toBe(false);
  });

  it("rifiuta una P.IVA a 11 cifre", () => {
    expect(isValidCodiceFiscalePersona("00743110157")).toBe(false);
  });
});

describe("isValidCodiceFiscaleAzienda", () => {
  it("accetta un CF numerico di persona giuridica", () => {
    expect(isValidCodiceFiscaleAzienda("00743110157")).toBe(true);
  });

  it("rifiuta un numero con cifra di controllo errata", () => {
    expect(isValidCodiceFiscaleAzienda("00743110158")).toBe(false);
  });
});

describe("isValidCodiceFiscale", () => {
  it("accetta entrambe le forme", () => {
    expect(isValidCodiceFiscale(CF)).toBe(true);
    expect(isValidCodiceFiscale("00743110157")).toBe(true);
  });

  it("rifiuta il resto", () => {
    expect(isValidCodiceFiscale("")).toBe(false);
    expect(isValidCodiceFiscale("NON UN CODICE")).toBe(false);
  });
});

describe("unscrambleOmocodia", () => {
  it("riporta un codice omocodico alla forma originale", () => {
    expect(unscrambleOmocodia(CF_OMOCODICO)).toBe(CF);
  });

  it("lascia invariato un codice già numerico", () => {
    expect(unscrambleOmocodia(CF)).toBe(CF);
  });

  it("restituisce l'input se non è un CF di persona fisica", () => {
    expect(unscrambleOmocodia("00743110157")).toBe("00743110157");
  });
});
