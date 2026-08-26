import { describe, expect, it } from "vitest";

import { buildAziendaSlug, parsePartitaIvaFromSlug, slugify } from "./slug";

describe("slugify", () => {
  it("normalizza una denominazione tipica", () => {
    expect(slugify("Esempio Manifattura S.p.A.")).toBe("esempio-manifattura-s-p-a");
  });

  it("toglie i segni diacritici", () => {
    expect(slugify("Società Metallurgica Città di Forlì")).toBe(
      "societa-metallurgica-citta-di-forli",
    );
  });

  it("non lascia trattini agli estremi", () => {
    expect(slugify("  — Acme & Co. —  ")).toBe("acme-co");
  });

  it("accorcia i nomi lunghissimi senza chiudere con un trattino", () => {
    const lungo = slugify("A".repeat(40) + " " + "B".repeat(40));
    expect(lungo.length).toBeLessThanOrEqual(60);
    expect(lungo.endsWith("-")).toBe(false);
  });

  it("restituisce stringa vuota se non resta nulla di utilizzabile", () => {
    expect(slugify("!!! ???")).toBe("");
  });
});

describe("buildAziendaSlug", () => {
  it("mette la Partita IVA in coda", () => {
    expect(buildAziendaSlug("Esempio Manifattura S.p.A.", "00743110157")).toBe(
      "esempio-manifattura-s-p-a-00743110157",
    );
  });

  it("usa la sola Partita IVA se la denominazione non produce nulla", () => {
    expect(buildAziendaSlug("???", "00743110157")).toBe("00743110157");
  });
});

describe("parsePartitaIvaFromSlug", () => {
  it("ritrova la Partita IVA in coda allo slug", () => {
    expect(parsePartitaIvaFromSlug("esempio-manifattura-s-p-a-00743110157")).toBe(
      "00743110157",
    );
  });

  it("accetta lo slug composto dalla sola Partita IVA", () => {
    expect(parsePartitaIvaFromSlug("00743110157")).toBe("00743110157");
  });

  it("rifiuta una cifra di controllo sbagliata", () => {
    expect(parsePartitaIvaFromSlug("esempio-00743110158")).toBeNull();
  });

  it("rifiuta uno slug senza Partita IVA in coda", () => {
    expect(parsePartitaIvaFromSlug("esempio-manifattura")).toBeNull();
    expect(parsePartitaIvaFromSlug("00743110157-esempio")).toBeNull();
  });

  it("sopravvive al viaggio di andata e ritorno", () => {
    const slug = buildAziendaSlug("Società Esempio S.r.l.", "00488410010");
    expect(parsePartitaIvaFromSlug(slug)).toBe("00488410010");
  });
});
