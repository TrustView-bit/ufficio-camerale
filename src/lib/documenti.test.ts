import { describe, expect, it } from "vitest";

import { documentiPer, DOCUMENTI, formatPrezzo } from "./documenti";

describe("documentiPer", () => {
  it("a una società offre tutto il catalogo", () => {
    expect(documentiPer({ eSocieta: true })).toHaveLength(DOCUMENTI.length);
  });

  it("a una ditta individuale non propone bilanci, soci o statuto", () => {
    const disponibili = documentiPer({ eSocieta: false }).map((d) => d.id);

    expect(disponibili).not.toContain("bilancio");
    expect(disponibili).not.toContain("elenco-soci");
    expect(disponibili).not.toContain("atto-costitutivo");
    expect(disponibili).toContain("visura-ordinaria");
  });

  it("propone comunque qualcosa a chiunque", () => {
    expect(documentiPer({ eSocieta: false }).length).toBeGreaterThan(0);
  });
});

describe("formatPrezzo", () => {
  it("formatta in euro all'italiana", () => {
    expect(formatPrezzo(7.8)).toContain("7,80");
    expect(formatPrezzo(39)).toContain("39,00");
  });
});

describe("catalogo", () => {
  it("non ha identificativi duplicati", () => {
    const id = DOCUMENTI.map((d) => d.id);
    expect(new Set(id).size).toBe(id.length);
  });

  it("ha sempre nome, descrizione e prezzo positivo", () => {
    for (const documento of DOCUMENTI) {
      expect(documento.nome.length).toBeGreaterThan(0);
      expect(documento.descrizione.length).toBeGreaterThan(10);
      expect(documento.prezzo).toBeGreaterThan(0);
    }
  });
});
