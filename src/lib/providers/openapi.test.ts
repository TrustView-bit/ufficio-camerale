import { afterEach, describe, expect, it, vi } from "vitest";

import avanzata from "./__fixtures__/openapi-it-advanced.json";
import iniziale from "./__fixtures__/openapi-it-start.json";
import {
  extractCompany,
  mapOpenapiCompany,
  mapStatoAttivita,
  OpenapiCompanyProvider,
} from "./openapi";

/**
 * Le fixture sono risposte REALI dell'API, catturate il 27 agosto 2026
 * interrogando la partita IVA di Openapi stessa. Non sono inventate: è la
 * differenza fra un adapter verificato e uno ipotizzato.
 */

const PIVA = "12485671007";

describe("IT-start — la risposta reale", () => {
  const raw = extractCompany(iniziale)!;
  const azienda = mapOpenapiCompany(raw, PIVA);

  it("legge i campi identificativi", () => {
    expect(azienda).toMatchObject({
      partitaIva: "12485671007",
      codiceFiscale: "12485671007",
      denominazione: "OPENAPI S.P.A.",
      statoAttivita: "attiva",
    });
  });

  it("non duplica l'indirizzo: streetName è già completo", () => {
    // il campo contiene "VIALE FILIPPO TOMMASO MARINETTI 221": ricomporlo con
    // toponimo e civico darebbe "VIALE VIALE … 221 221"
    expect(azienda.sede?.via).toBe("Viale Filippo Tommaso Marinetti 221");
  });

  it("riporta comune e indirizzo alla forma usata nel resto del sito", () => {
    // il fornitore scrive "ROMA" in maiuscolo
    expect(azienda.sede).toMatchObject({
      cap: "00143",
      comune: "Roma",
      provincia: "RM",
    });
  });

  it("legge le coordinate della sede, non del comune", () => {
    // GPS arriva come [longitudine, latitudine]
    expect(azienda.coordinate?.lat).toBeCloseTo(41.8071, 3);
    expect(azienda.coordinate?.lon).toBeCloseTo(12.47843, 3);
  });

  it("legge il codice destinatario per la fatturazione elettronica", () => {
    expect(azienda.codiceSdi).toBe("USAL8PV");
  });

  it("non inventa i campi che questo livello non fornisce", () => {
    expect(azienda.formaGiuridica).toBeNull();
    expect(azienda.capitaleSociale).toBeNull();
    expect(azienda.reaNumero).toBeNull();
    expect(azienda.bilanci).toEqual([]);
  });
});

describe("IT-advanced — la risposta reale", () => {
  const raw = extractCompany(avanzata)!;
  const azienda = mapOpenapiCompany(raw, PIVA);

  it("legge la forma giuridica dalla sua struttura annidata", () => {
    expect(azienda.formaGiuridica).toBe("SOCIETA' PER AZIONI");
  });

  it("compone il REA con la camera di commercio", () => {
    expect(azienda.reaCciaa).toBe("RM");
    expect(azienda.reaNumero).toBe("1378273");
  });

  it("prende capitale e dipendenti dall'ultimo bilancio, non dall'impresa", () => {
    expect(azienda.capitaleSociale).toBe(50000);
    expect(azienda.dipendenti).toBe(19);
  });

  it("legge la serie storica dei bilanci, dal più recente", () => {
    expect(azienda.bilanci.length).toBeGreaterThan(5);
    expect(azienda.bilanci[0]!.anno).toBeGreaterThan(azienda.bilanci[1]!.anno);

    const duemila25 = azienda.bilanci.find((b) => b.anno === 2025);
    expect(duemila25).toMatchObject({ fatturato: 5696858, dipendenti: 19 });
  });

  it("usa l'ATECO 2025 quando c'è, non quello vecchio", () => {
    expect(azienda.atecoPrimario).toBe("621");
    expect(azienda.atecoVersione).toBe("2025");
  });

  it("legge la PEC", () => {
    expect(azienda.pec).toBe("openapi@legalmail.it");
  });

  it("legge la data di costituzione", () => {
    expect(azienda.dataCostituzione).toBe("2013-10-20");
  });
});

describe("mapStatoAttivita", () => {
  it("riconosce le diciture note", () => {
    expect(mapStatoAttivita("ATTIVA")).toBe("attiva");
    expect(mapStatoAttivita("CESSATA")).toBe("cessata");
    expect(mapStatoAttivita("IN LIQUIDAZIONE")).toBe("in-liquidazione");
    expect(mapStatoAttivita("INATTIVA")).toBe("inattiva");
  });

  it("dà precedenza alla liquidazione, che contiene anche 'attiv'", () => {
    expect(mapStatoAttivita("ATTIVA IN LIQUIDAZIONE")).toBe("in-liquidazione");
  });

  it("non inventa uno stato quando non lo riconosce", () => {
    expect(mapStatoAttivita(null)).toBe("sconosciuto");
    expect(mapStatoAttivita("QUALCOSA DI NUOVO")).toBe("sconosciuto");
  });
});

describe("extractCompany", () => {
  it("gestisce sia l'array sia l'oggetto singolo", () => {
    expect(extractCompany(iniziale)?.companyName).toBe("OPENAPI S.P.A.");
    expect(extractCompany({ data: extractCompany(iniziale) })?.companyName).toBe(
      "OPENAPI S.P.A.",
    );
  });

  it("restituisce null quando non c'è nulla di utilizzabile", () => {
    expect(extractCompany({ success: true, data: [] })).toBeNull();
    expect(extractCompany({ success: false, data: null })).toBeNull();
    expect(extractCompany("non json")).toBeNull();
  });

  it("rifiuta una risposta priva di denominazione invece di inventarla", () => {
    expect(extractCompany({ data: [{ vatCode: PIVA }] })).toBeNull();
  });
});

describe("OpenapiCompanyProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  const provider = new OpenapiCompanyProvider("token-finto", "IT-advanced");

  it("invia il token come Bearer sul livello richiesto", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(avanzata));
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.getByPartitaIva(PIVA);
    expect(result.status).toBe("found");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`https://company.openapi.com/IT-advanced/${PIVA}`);
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
      await expect(provider.getByPartitaIva(PIVA)).resolves.toMatchObject({
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
    await expect(provider.getByPartitaIva(PIVA)).resolves.toMatchObject({
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
    await expect(provider.getByPartitaIva(PIVA)).resolves.toEqual({
      status: "unavailable",
      reason: "TIMEOUT",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(provider.getByPartitaIva(PIVA)).resolves.toEqual({
      status: "unavailable",
      reason: "NETWORK",
    });
  });

  it("segnala una risposta fuori schema invece di produrre dati sbagliati", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [{ qualcosa: "di diverso" }] })),
    );
    await expect(provider.getByPartitaIva(PIVA)).resolves.toMatchObject({
      status: "unavailable",
      reason: "UNEXPECTED",
    });
  });

  it("distingue una risposta vuota da una malformata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [] })),
    );
    await expect(provider.getByPartitaIva(PIVA)).resolves.toMatchObject({
      status: "not-found",
    });
  });
});
