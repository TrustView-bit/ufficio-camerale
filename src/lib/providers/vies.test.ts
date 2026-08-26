import { afterEach, describe, expect, it, vi } from "vitest";

import { checkVies, parseViesResponse, VIES_UNAVAILABLE_MESSAGE } from "./vies";

const FALLBACK = { countryCode: "IT", vatNumber: "00743110157" };

/** Risposta tipica di VIES per una partita esistente. */
const OK_RESPONSE = {
  isValid: true,
  requestDate: "2026-08-26+02:00",
  userError: "VALID",
  name: "MOTOROLA SOLUTIONS ITALIA SRL",
  address: "LARGO FRANCESCO RICHINI 6 \n20122 MILANO MI",
  vatNumber: "00743110157",
  countryCode: "IT",
};

describe("parseViesResponse", () => {
  it("riconosce una partita valida", () => {
    const result = parseViesResponse(OK_RESPONSE, FALLBACK);
    expect(result.status).toBe("valid");
    expect(result).toMatchObject({
      name: "MOTOROLA SOLUTIONS ITALIA SRL",
      address: "LARGO FRANCESCO RICHINI 6 \n20122 MILANO MI",
      vatNumber: "00743110157",
    });
  });

  it("riconosce una partita inesistente", () => {
    const result = parseViesResponse(
      { ...OK_RESPONSE, isValid: false, userError: "INVALID", name: "---" },
      FALLBACK,
    );
    expect(result.status).toBe("invalid");
  });

  it("azzera i campi che lo Stato membro non divulga", () => {
    const result = parseViesResponse(
      { ...OK_RESPONSE, name: "---", address: "   " },
      FALLBACK,
    );
    expect(result).toMatchObject({ status: "valid", name: null, address: null });
  });

  it("distingue l'indisponibilità dall'esito negativo", () => {
    for (const reason of [
      "MS_UNAVAILABLE",
      "SERVICE_UNAVAILABLE",
      "TIMEOUT",
      "MS_MAX_CONCURRENT_REQ",
      "GLOBAL_MAX_CONCURRENT_REQ",
    ] as const) {
      const result = parseViesResponse(
        { isValid: false, userError: reason },
        FALLBACK,
      );
      expect(result).toEqual({ status: "unavailable", reason });
    }
  });

  it("non scambia un servizio giù per una partita inesistente", () => {
    const down = parseViesResponse(
      { isValid: false, userError: "MS_UNAVAILABLE" },
      FALLBACK,
    );
    expect(down.status).not.toBe("invalid");
  });

  it("riconosce l'input rifiutato da VIES", () => {
    const result = parseViesResponse(
      { isValid: false, userError: "INVALID_INPUT" },
      FALLBACK,
    );
    expect(result.status).toBe("invalid-input");
  });

  it("tratta una risposta illeggibile come indisponibilità", () => {
    expect(parseViesResponse({ foo: "bar" }, FALLBACK)).toEqual({
      status: "unavailable",
      reason: "UNEXPECTED",
    });
    expect(parseViesResponse(null, FALLBACK)).toEqual({
      status: "unavailable",
      reason: "UNEXPECTED",
    });
  });

  it("ripiega sui valori noti se VIES non li rimanda indietro", () => {
    const result = parseViesResponse({ isValid: true }, FALLBACK);
    expect(result).toMatchObject({
      status: "valid",
      countryCode: "IT",
      vatNumber: "00743110157",
    });
  });

  it("ha un messaggio per ogni motivo di indisponibilità", () => {
    for (const message of Object.values(VIES_UNAVAILABLE_MESSAGE)) {
      expect(message.length).toBeGreaterThan(10);
    }
  });
});

describe("checkVies", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("non chiama la rete se la P.IVA è formalmente invalida", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkVies("00743110158");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe("invalid-input");
  });

  it("normalizza la P.IVA prima di interrogare VIES", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(OK_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);

    await checkVies("IT 007 4311 0157");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/ms/IT/vat/00743110157");
  });

  it("traduce un timeout in indisponibilità, senza lanciare", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      }),
    );

    await expect(checkVies("00743110157")).resolves.toEqual({
      status: "unavailable",
      reason: "TIMEOUT",
    });
  });

  it("traduce un errore di rete in indisponibilità", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(checkVies("00743110157")).resolves.toEqual({
      status: "unavailable",
      reason: "NETWORK",
    });
  });

  it("tratta un 5xx come servizio fuori uso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 503 })),
    );

    await expect(checkVies("00743110157")).resolves.toEqual({
      status: "unavailable",
      reason: "SERVICE_UNAVAILABLE",
    });
  });

  it("tratta un corpo non JSON come risposta inattesa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>errore</html>", { status: 200 })),
    );

    await expect(checkVies("00743110157")).resolves.toEqual({
      status: "unavailable",
      reason: "UNEXPECTED",
    });
  });

  it("interrompe la richiesta dopo il timeout previsto", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(OK_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);

    await checkVies("00743110157");

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
