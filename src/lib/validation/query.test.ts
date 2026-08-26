import { describe, expect, it } from "vitest";

import {
  analyzeQuery,
  partitaIvaSchema,
  QUERY_KIND_TEXT,
  searchQuerySchema,
} from "./query";

describe("analyzeQuery", () => {
  it("riconosce una Partita IVA valida", () => {
    const result = analyzeQuery("00743110157");
    expect(result.kind).toBe("partita-iva");
    expect(result.isValid).toBe(true);
    expect(result.value).toBe("00743110157");
  });

  it("riconosce una P.IVA anche se scritta con spazi o prefisso IT", () => {
    expect(analyzeQuery("IT 007 4311 0157").kind).toBe("partita-iva");
    expect(analyzeQuery("IT 007 4311 0157").isValid).toBe(true);
  });

  it("segnala una P.IVA con cifra di controllo errata", () => {
    const result = analyzeQuery("00743110158");
    expect(result.kind).toBe("partita-iva");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("cifra di controllo");
  });

  it("riconosce un codice fiscale valido", () => {
    const result = analyzeQuery("mrtmtt25d09f205z");
    expect(result.kind).toBe("codice-fiscale");
    expect(result.isValid).toBe(true);
    expect(result.value).toBe("MRTMTT25D09F205Z");
  });

  it("distingue un CF malformato da uno con controllo errato", () => {
    expect(analyzeQuery("MRTMTT25D09F205A").error).toContain(
      "carattere di controllo",
    );
    expect(analyzeQuery("1RTMTT25D09F205Z").error).toContain("formato");
  });

  it("tratta il resto come ragione sociale", () => {
    const result = analyzeQuery("  Ferrari   S.p.A.  ");
    expect(result.kind).toBe("denominazione");
    expect(result.isValid).toBe(true);
    expect(result.value).toBe("Ferrari S.p.A.");
  });

  it("rifiuta una ragione sociale troppo corta", () => {
    const result = analyzeQuery("F");
    expect(result.kind).toBe("denominazione");
    expect(result.isValid).toBe(false);
  });

  it("non scambia per P.IVA un numero di lunghezza diversa", () => {
    expect(analyzeQuery("1234567890").kind).toBe("denominazione");
    expect(analyzeQuery("123456789012").kind).toBe("denominazione");
  });

  it("conserva sempre il testo digitato", () => {
    expect(analyzeQuery("  Ferrari  ").raw).toBe("Ferrari");
  });
});

describe("searchQuerySchema", () => {
  it("accetta una ricerca di lunghezza ragionevole", () => {
    expect(searchQuerySchema.safeParse("Ferrari").success).toBe(true);
  });

  it("rifiuta stringhe vuote o troppo lunghe", () => {
    expect(searchQuerySchema.safeParse(" ").success).toBe(false);
    expect(searchQuerySchema.safeParse("x".repeat(121)).success).toBe(false);
  });
});

describe("partitaIvaSchema", () => {
  it("normalizza e valida", () => {
    const result = partitaIvaSchema.safeParse("IT 00743110157");
    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe("00743110157");
  });

  it("rifiuta una P.IVA non valida", () => {
    expect(partitaIvaSchema.safeParse("00743110158").success).toBe(false);
  });
});

describe("QUERY_KIND_TEXT", () => {
  it("concorda il genere: la Partita IVA è valida, il codice fiscale è valido", () => {
    expect(QUERY_KIND_TEXT["partita-iva"].recognized).toContain("valida");
    expect(QUERY_KIND_TEXT["partita-iva"].invalidTitle).toBe(
      "Partita IVA non valida",
    );
    expect(QUERY_KIND_TEXT["codice-fiscale"].recognized).toContain("valido");
    expect(QUERY_KIND_TEXT["codice-fiscale"].invalidTitle).toBe(
      "Codice fiscale non valido",
    );
  });

  it("copre tutti i tipi riconosciuti", () => {
    for (const kind of [
      "partita-iva",
      "codice-fiscale",
      "denominazione",
    ] as const) {
      const text = QUERY_KIND_TEXT[kind];
      expect(text.label.length).toBeGreaterThan(0);
      expect(text.recognized.length).toBeGreaterThan(0);
      expect(text.invalidTitle.length).toBeGreaterThan(0);
      expect(text.meaning.length).toBeGreaterThan(0);
    }
  });
});
