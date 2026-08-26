import { describe, expect, it } from "vitest";

import { chiaveRicerca, punteggio } from "./ricerca";

describe("chiaveRicerca", () => {
  it("appiattisce accenti, punteggiatura e maiuscole", () => {
    expect(chiaveRicerca("SOCIETA' METALLURGICA S.R.L.")).toBe(
      "societa metallurgica s r l",
    );
    expect(chiaveRicerca("Città di Forlì")).toBe("citta di forli");
  });
});

describe("punteggio", () => {
  it("premia la corrispondenza esatta", () => {
    expect(punteggio("Garden House", "garden house")).toBe(100);
  });

  it("premia l'inizio della denominazione", () => {
    const inizio = punteggio("Garden House S.r.l.s.", "garden");
    const dentro = punteggio("Il Garden di Mario", "garden");
    expect(inizio).toBeGreaterThan(dentro);
  });

  it("richiede tutte le parole digitate", () => {
    expect(
      punteggio("Costruzioni Sannite S.r.l.", "costruzioni sannite"),
    ).toBeGreaterThan(0);
    expect(punteggio("Costruzioni Sannite S.r.l.", "costruzioni romane")).toBe(0);
  });

  it("ignora accenti e punteggiatura da entrambe le parti", () => {
    expect(
      punteggio("SOCIETA' COOPERATIVA", "societa cooperativa"),
    ).toBeGreaterThan(0);
    expect(
      punteggio("Società Cooperativa", "SOCIETA' COOPERATIVA"),
    ).toBeGreaterThan(0);
  });

  it("non trova nulla con una ricerca vuota", () => {
    expect(punteggio("Qualsiasi Azienda", "")).toBe(0);
    expect(punteggio("Qualsiasi Azienda", "   ")).toBe(0);
  });

  it("trova una parola in mezzo alla denominazione", () => {
    expect(
      punteggio("Cooperativa di Consumo La Popolare", "popolare"),
    ).toBeGreaterThan(0);
  });
});
