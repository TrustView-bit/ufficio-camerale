import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractCompany,
  mapOpenapiCompany,
  mapStatoAttivita,
  OpenapiCompanyProvider,
} from "./openapi";

const RAW = {
  companyName: "ESEMPIO MANIFATTURA S.P.A.",
  vatCode: "00743110157",
  taxCode: "00743110157",
  legalForm: "SOCIETA' PER AZIONI",
  activityStatus: "ATTIVA",
  registrationDate: "1962-04-17T00:00:00.000Z",
  reaCode: 1305487,
  cciaa: "MI",
  shareCapital: "2500000.00",
  atecoClassification: {
    ateco: { code: "25.62.00", description: "Lavori di meccanica generale" },
  },
  address: {
    registeredOffice: {
      toponym: "LARGO",
      streetName: "FRANCESCO RICHINI",
      streetNumber: "6",
      town: "MILANO",
      province: "MI",
      zipCode: "20122",
    },
  },
  pec: "esempio@pec.example.it",
  website: "https://www.example.it",
  phone: "+39 02 1234567",
  employees: "92",
};

describe("mapStatoAttivita", () => {
  it("riconosce le diciture note", () => {
    expect(mapStatoAttivita("ATTIVA")).toBe("attiva");
    expect(mapStatoAttivita("Impresa attiva")).toBe("attiva");
    expect(mapStatoAttivita("CESSATA")).toBe("cessata");
    expect(mapStatoAttivita("INATTIVA")).toBe("cessata");
    expect(mapStatoAttivita("IN LIQUIDAZIONE")).toBe("in-liquidazione");
  });

  it("dà precedenza alla liquidazione, che contiene anche 'attiv'", () => {
    expect(mapStatoAttivita("ATTIVA IN LIQUIDAZIONE")).toBe("in-liquidazione");
  });

  it("non inventa uno stato quando non lo riconosce", () => {
    expect(mapStatoAttivita(null)).toBe("sconosciuto");
    expect(mapStatoAttivita("QUALCOSA DI NUOVO")).toBe("sconosciuto");
  });
});

describe("mapOpenapiCompany", () => {
  it("normalizza i campi principali", () => {
    const company = mapOpenapiCompany(RAW, "00743110157");

    expect(company).toMatchObject({
      partitaIva: "00743110157",
      denominazione: "ESEMPIO MANIFATTURA S.P.A.",
      statoAttivita: "attiva",
      reaNumero: "1305487",
      reaCciaa: "MI",
      capitaleSociale: 2_500_000,
      atecoPrimario: "25.62.00",
      dipendenti: 92,
    });
  });

  it("taglia la data di costituzione alla sola parte ISO", () => {
    expect(mapOpenapiCompany(RAW, "00743110157").dataCostituzione).toBe(
      "1962-04-17",
    );
  });

  it("ricompone l'indirizzo dai pezzi", () => {
    expect(mapOpenapiCompany(RAW, "00743110157").sede).toEqual({
      via: "LARGO FRANCESCO RICHINI 6",
      cap: "20122",
      comune: "MILANO",
      provincia: "MI",
      nazione: "IT",
    });
  });

  it("restituisce null invece di un indirizzo vuoto", () => {
    const company = mapOpenapiCompany(
      { ...RAW, address: { registeredOffice: {} } },
      "00743110157",
    );
    expect(company.sede).toBeNull();
  });

  it("ripiega sulla P.IVA richiesta se la risposta non la contiene", () => {
    const company = mapOpenapiCompany(
      { companyName: "SENZA PARTITA" },
      "00743110157",
    );
    expect(company.partitaIva).toBe("00743110157");
    expect(company.capitaleSociale).toBeNull();
    expect(company.sede).toBeNull();
  });
});

describe("extractCompany", () => {
  it("gestisce sia l'array sia l'oggetto singolo", () => {
    expect(extractCompany({ success: true, data: [RAW] })?.companyName).toBe(
      RAW.companyName,
    );
    expect(extractCompany({ success: true, data: RAW })?.companyName).toBe(
      RAW.companyName,
    );
  });

  it("restituisce null quando non c'è nulla di utilizzabile", () => {
    expect(extractCompany({ success: true, data: [] })).toBeNull();
    expect(extractCompany({ success: false, data: null })).toBeNull();
    expect(extractCompany("non json")).toBeNull();
  });

  it("rifiuta una risposta priva di denominazione invece di inventarla", () => {
    expect(extractCompany({ data: [{ vatCode: "00743110157" }] })).toBeNull();
  });
});

describe("OpenapiCompanyProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  const provider = new OpenapiCompanyProvider("token-finto");

  it("invia il token come Bearer sul livello richiesto", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ success: true, data: [RAW] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.getByPartitaIva("00743110157");

    expect(result.status).toBe("found");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://company.openapi.com/IT-start/00743110157");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-finto",
    );
  });

  it("traduce gli stati HTTP nei motivi di indisponibilità", async () => {
    const casi = [
      { status: 401, reason: "UNAUTHORIZED" },
      { status: 403, reason: "UNAUTHORIZED" },
      { status: 402, reason: "QUOTA_EXCEEDED" },
      { status: 429, reason: "RATE_LIMITED" },
      { status: 500, reason: "SERVICE_UNAVAILABLE" },
      { status: 418, reason: "UNEXPECTED" },
    ] as const;

    for (const caso of casi) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("", { status: caso.status })),
      );
      await expect(provider.getByPartitaIva("00743110157")).resolves.toMatchObject({
        status: "unavailable",
        reason: caso.reason,
      });
    }
  });

  it("tratta il 404 come impresa inesistente, non come guasto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    await expect(provider.getByPartitaIva("00743110157")).resolves.toMatchObject({
      status: "not-found",
    });
  });

  it("non lancia su timeout o errore di rete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("timeout", "TimeoutError");
      }),
    );
    await expect(provider.getByPartitaIva("00743110157")).resolves.toEqual({
      status: "unavailable",
      reason: "TIMEOUT",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(provider.getByPartitaIva("00743110157")).resolves.toEqual({
      status: "unavailable",
      reason: "NETWORK",
    });
  });

  it("segnala una risposta fuori schema invece di produrre dati sbagliati", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [{ qualcosa: "di diverso" }] })),
    );
    await expect(provider.getByPartitaIva("00743110157")).resolves.toMatchObject({
      status: "unavailable",
      reason: "UNEXPECTED",
    });
  });

  it("distingue una risposta vuota da una malformata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: null })),
    );
    await expect(provider.getByPartitaIva("00743110157")).resolves.toMatchObject({
      status: "not-found",
    });
  });
});
