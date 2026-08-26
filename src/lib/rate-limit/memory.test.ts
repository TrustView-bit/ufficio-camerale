import { describe, expect, it } from "vitest";

import { MemoryRateLimiter, type RateLimitRule } from "./memory";

const MINUTO: RateLimitRule = { nome: "minuto", limite: 3, finestraMs: 60_000 };
const GIORNO: RateLimitRule = { nome: "giorno", limite: 5, finestraMs: 86_400_000 };

/** Orologio controllabile, per non dover aspettare davvero. */
function orologio(partenza = 1_000_000) {
  let adesso = partenza;
  return {
    now: () => adesso,
    avanza: (ms: number) => {
      adesso += ms;
    },
  };
}

describe("MemoryRateLimiter", () => {
  it("lascia passare le richieste sotto il limite", async () => {
    const limiter = new MemoryRateLimiter([MINUTO]);

    for (let i = 0; i < 3; i++) {
      const esito = await limiter.check("1.2.3.4");
      expect(esito.success).toBe(true);
    }
  });

  it("blocca la richiesta oltre il limite", async () => {
    const limiter = new MemoryRateLimiter([MINUTO]);

    for (let i = 0; i < 3; i++) await limiter.check("1.2.3.4");
    const esito = await limiter.check("1.2.3.4");

    expect(esito.success).toBe(false);
    expect(esito.remaining).toBe(0);
  });

  it("scala il residuo a ogni richiesta", async () => {
    const limiter = new MemoryRateLimiter([MINUTO]);

    expect((await limiter.check("1.2.3.4")).remaining).toBe(2);
    expect((await limiter.check("1.2.3.4")).remaining).toBe(1);
    expect((await limiter.check("1.2.3.4")).remaining).toBe(0);
  });

  it("conta ogni indirizzo per conto suo", async () => {
    const limiter = new MemoryRateLimiter([MINUTO]);

    for (let i = 0; i < 3; i++) await limiter.check("1.2.3.4");

    expect((await limiter.check("5.6.7.8")).success).toBe(true);
    expect((await limiter.check("1.2.3.4")).success).toBe(false);
  });

  it("riapre quando la finestra scorre", async () => {
    const tempo = orologio();
    const limiter = new MemoryRateLimiter([MINUTO], tempo.now);

    for (let i = 0; i < 3; i++) await limiter.check("1.2.3.4");
    expect((await limiter.check("1.2.3.4")).success).toBe(false);

    tempo.avanza(61_000);
    expect((await limiter.check("1.2.3.4")).success).toBe(true);
  });

  it("applica la regola più restrittiva fra quelle configurate", async () => {
    const tempo = orologio();
    const limiter = new MemoryRateLimiter([MINUTO, GIORNO], tempo.now);

    // tre al minuto, poi si aspetta e se ne fanno altre due: siamo a cinque
    for (let i = 0; i < 3; i++) await limiter.check("1.2.3.4");
    tempo.avanza(61_000);
    for (let i = 0; i < 2; i++) await limiter.check("1.2.3.4");

    // il limite al minuto sarebbe libero, ma quello giornaliero è esaurito
    const esito = await limiter.check("1.2.3.4");
    expect(esito.success).toBe(false);
    expect(esito.limit).toBe(5);
  });

  it("dice quando la finestra si riapre", async () => {
    const tempo = orologio();
    const limiter = new MemoryRateLimiter([MINUTO], tempo.now);

    const primo = await limiter.check("1.2.3.4");
    expect(primo.reset).toBe(tempo.now() + 60_000);
  });

  it("non accumula colpi ormai fuori da ogni finestra", async () => {
    const tempo = orologio();
    const limiter = new MemoryRateLimiter([MINUTO], tempo.now);

    for (let i = 0; i < 3; i++) {
      await limiter.check("1.2.3.4");
      tempo.avanza(30_000);
    }

    // i primi due colpi sono usciti dalla finestra
    expect((await limiter.check("1.2.3.4")).success).toBe(true);
  });
});
