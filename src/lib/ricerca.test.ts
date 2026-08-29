import { describe, expect, it } from "vitest";

import { chiaveRicerca, punteggio } from "./ricerca";

describe("chiaveRicerca", () => {
  it("appiattisce accenti, punteggiatura e maiuscole", () => {
    expect(chiaveRicerca("SOCIETA' METALLURGICA S.R.L.")).toBe(
      "societa metallurgica srl",
    );
    expect(chiaveRicerca("Città di Forlì")).toBe("citta di forli");
  });
});

describe("chiaveRicerca, sigle", () => {
  it("ricompone le sigle puntate in una parola sola", () => {
    expect(chiaveRicerca("ENI S.P.A.")).toBe("eni spa");
    expect(chiaveRicerca("A.D.R. Costruzioni")).toBe("adr costruzioni");
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

  it("chi scrive «eni spa» cerca ENI, non Thales Alenia Space", () => {
    const eni = punteggio("ENI S.P.A.", "eni spa");
    const alenia = punteggio("THALES ALENIA SPACE ITALIA S.P.A.", "eni spa");

    expect(eni).toBe(100);
    expect(eni).toBeGreaterThan(alenia);
  });

  it("una parola che apre un nome vale più di una che sta in mezzo", () => {
    const apre = punteggio("ENI Plenitude S.p.A.", "eni");
    const dentro = punteggio("Thales Alenia Space Italia S.p.A.", "eni");

    expect(apre).toBeGreaterThan(dentro);
    expect(dentro).toBeGreaterThan(0);
  });

  it("continua a trovare una parola dentro un nome composto", () => {
    expect(punteggio("INTESA SANPAOLO S.P.A.", "intesa san paolo")).toBeGreaterThan(
      0,
    );
  });
});
