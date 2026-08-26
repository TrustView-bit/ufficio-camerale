import { describe, expect, it } from "vitest";

import {
  hasPartitaIvaFormat,
  isValidPartitaIva,
  normalizePartitaIva,
  partitaIvaCheckDigit,
} from "./partita-iva";

// P.IVA reali, confermate valide da VIES e verificabili a mano con Luhn
const VALIDE = [
  "00743110157", // Motorola Solutions Italia S.r.l.
  "12485671007", // Openapi S.p.A.
  "00488410010", // TIM S.p.A.
];

describe("normalizePartitaIva", () => {
  it("rimuove spazi e punteggiatura", () => {
    expect(normalizePartitaIva(" 007 431.101-57 ")).toBe("00743110157");
  });

  it("rimuove il prefisso IT", () => {
    expect(normalizePartitaIva("IT00743110157")).toBe("00743110157");
    expect(normalizePartitaIva("it 00743110157")).toBe("00743110157");
  });

  it("non tocca una P.IVA già pulita", () => {
    expect(normalizePartitaIva("00743110157")).toBe("00743110157");
  });
});

describe("hasPartitaIvaFormat", () => {
  it("accetta esattamente 11 cifre", () => {
    expect(hasPartitaIvaFormat("00743110157")).toBe(true);
  });

  it("rifiuta lunghezze diverse", () => {
    expect(hasPartitaIvaFormat("0074311015")).toBe(false);
    expect(hasPartitaIvaFormat("007431101570")).toBe(false);
  });

  it("rifiuta caratteri non numerici", () => {
    expect(hasPartitaIvaFormat("0074311015A")).toBe(false);
  });
});

describe("partitaIvaCheckDigit", () => {
  it("calcola la cifra di controllo delle P.IVA note", () => {
    for (const piva of VALIDE) {
      expect(partitaIvaCheckDigit(piva.slice(0, 10))).toBe(Number(piva[10]));
    }
  });

  it("restituisce null se l'input non ha 10 cifre", () => {
    expect(partitaIvaCheckDigit("123")).toBeNull();
    expect(partitaIvaCheckDigit("12345678AB")).toBeNull();
  });

  it("produce sempre una cifra fra 0 e 9", () => {
    for (let i = 0; i < 1000; i++) {
      const base = String(i).padStart(10, "0");
      const digit = partitaIvaCheckDigit(base)!;
      expect(digit).toBeGreaterThanOrEqual(0);
      expect(digit).toBeLessThanOrEqual(9);
    }
  });
});

describe("isValidPartitaIva", () => {
  it("accetta le P.IVA valide", () => {
    for (const piva of VALIDE) {
      expect(isValidPartitaIva(piva)).toBe(true);
    }
  });

  it("rifiuta una cifra di controllo sbagliata", () => {
    // stessa P.IVA valida, con l'ultima cifra alterata
    expect(isValidPartitaIva("00743110158")).toBe(false);
    expect(isValidPartitaIva("00743110150")).toBe(false);
  });

  it("intercetta la trasposizione di due cifre adiacenti", () => {
    // Luhn non rileva lo scambio 09 <-> 90, ma rileva gli altri
    expect(isValidPartitaIva("00473110157")).toBe(false);
  });

  it("rifiuta stringhe non numeriche o di lunghezza errata", () => {
    expect(isValidPartitaIva("")).toBe(false);
    expect(isValidPartitaIva("abcdefghijk")).toBe(false);
    expect(isValidPartitaIva("0074311015")).toBe(false);
  });

  it("accetta la P.IVA composta da soli zeri, che è formalmente valida", () => {
    expect(isValidPartitaIva("00000000000")).toBe(true);
  });
});
