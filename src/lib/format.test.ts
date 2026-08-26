import { describe, expect, it } from "vitest";

import {
  anniDi,
  formatDataIso,
  formatEuro,
  formatIndirizzo,
  hostnameDi,
  mascheraCodiceFiscale,
  toSitoHref,
  toTelHref,
} from "./format";

describe("formatEuro", () => {
  it("formatta all'italiana", () => {
    expect(formatEuro(2_500_000)).toContain("2.500.000");
  });

  it("distingue lo zero dall'assenza di dato", () => {
    expect(formatEuro(0)).toContain("0");
    expect(formatEuro(null)).toBeNull();
  });
});

describe("formatDataIso", () => {
  it("scrive la data per esteso", () => {
    expect(formatDataIso("1962-04-17")).toBe("17 aprile 1962");
  });

  it("non si inventa nulla su input inutilizzabili", () => {
    expect(formatDataIso(null)).toBeNull();
    expect(formatDataIso("non-una-data")).toBeNull();
  });
});

describe("anniDi", () => {
  const oggi = new Date("2026-08-26T00:00:00Z");

  it("conta gli anni compiuti", () => {
    expect(anniDi("2000-08-26", oggi)).toBe(26);
    expect(anniDi("2000-08-27", oggi)).toBe(25);
  });

  it("restituisce null per date future o assenti", () => {
    expect(anniDi("2030-01-01", oggi)).toBeNull();
    expect(anniDi(null, oggi)).toBeNull();
  });
});

describe("formatIndirizzo", () => {
  it("compone via, CAP, comune e provincia", () => {
    expect(
      formatIndirizzo({
        via: "Largo Francesco Richini 6",
        cap: "20122",
        comune: "Milano",
        provincia: "MI",
        nazione: "IT",
      }),
    ).toBe("Largo Francesco Richini 6, 20122 Milano (MI)");
  });

  it("salta i pezzi mancanti senza lasciare virgole vaganti", () => {
    expect(
      formatIndirizzo({
        via: null,
        cap: null,
        comune: "Milano",
        provincia: null,
        nazione: "IT",
      }),
    ).toBe("Milano");
  });

  it("restituisce null se non c'è nulla da mostrare", () => {
    expect(formatIndirizzo(null)).toBeNull();
    expect(
      formatIndirizzo({
        via: null,
        cap: null,
        comune: null,
        provincia: null,
        nazione: null,
      }),
    ).toBeNull();
  });
});

describe("toTelHref", () => {
  it("ripulisce il numero conservando il prefisso", () => {
    expect(toTelHref("+39 02 1234567")).toBe("tel:+39021234567");
  });

  it("scarta i numeri troppo corti per essere veri", () => {
    expect(toTelHref("123")).toBeNull();
    expect(toTelHref(null)).toBeNull();
  });
});

describe("toSitoHref e hostnameDi", () => {
  it("aggiunge lo schema quando manca", () => {
    expect(toSitoHref("example.it")).toBe("https://example.it");
    expect(toSitoHref("http://example.it")).toBe("http://example.it");
  });

  it("mostra il dominio senza www", () => {
    expect(hostnameDi("https://www.example.it/pagina")).toBe("example.it");
  });

  it("non produce link da valori vuoti", () => {
    expect(toSitoHref("   ")).toBeNull();
    expect(hostnameDi(null)).toBeNull();
  });
});

describe("mascheraCodiceFiscale", () => {
  it("oscura data e luogo di nascita di una persona fisica", () => {
    expect(mascheraCodiceFiscale("FRRGPP80A01G535B")).toBe("FRRGPP*****G535B");
    expect(mascheraCodiceFiscale("MRTMTT25D09F205Z")).toBe("MRTMTT*****F205Z");
  });

  it("conserva la lunghezza e le parti che identificano l'impresa", () => {
    const mascherato = mascheraCodiceFiscale("MRTMTT25D09F205Z")!;
    expect(mascherato).toHaveLength(16);
    expect(mascherato.startsWith("MRTMTT")).toBe(true);
    expect(mascherato.endsWith("F205Z")).toBe(true);
  });

  it("non tocca il codice fiscale di una società, che è la Partita IVA", () => {
    expect(mascheraCodiceFiscale("00743110157")).toBe("00743110157");
  });

  it("regge input assenti o irregolari", () => {
    expect(mascheraCodiceFiscale(null)).toBeNull();
    expect(mascheraCodiceFiscale("  mrtmtt25d09f205z  ")).toBe("MRTMTT*****F205Z");
  });
});
