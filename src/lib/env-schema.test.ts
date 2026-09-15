import { describe, expect, it } from "vitest";

import { parseEnv, SITO_PRODUZIONE } from "./env-schema";

/** Esattamente ciò che si ottiene copiando .env.example senza compilarlo. */
const ENV_APPENA_COPIATO = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  DATABASE_URL: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  COMPANY_PROVIDER: "mock",
  OPENAPI_IT_TOKEN: "",
  REFRESH_AFTER_DAYS: "30",
  ANTHROPIC_API_KEY: "",
  ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
};

describe("parseEnv", () => {
  it("accetta un ambiente vuoto, con i valori predefiniti", () => {
    const esito = parseEnv({});

    expect(esito.ok).toBe(true);
    if (esito.ok) {
      expect(esito.env.COMPANY_PROVIDER).toBe("mock");
      expect(esito.env.REFRESH_AFTER_DAYS).toBe(30);
      expect(esito.env.DATABASE_URL).toBeUndefined();
    }
  });

  it("tratta come assente una variabile scritta ma lasciata vuota", () => {
    // è il caso di chi copia .env.example seguendo il README
    const esito = parseEnv(ENV_APPENA_COPIATO);

    expect(esito.ok).toBe(true);
    if (esito.ok) {
      expect(esito.env.DATABASE_URL).toBeUndefined();
      expect(esito.env.UPSTASH_REDIS_REST_URL).toBeUndefined();
      expect(esito.env.ANTHROPIC_API_KEY).toBeUndefined();
    }
  });

  it("considera vuota anche una variabile fatta di soli spazi", () => {
    const esito = parseEnv({ ...ENV_APPENA_COPIATO, DATABASE_URL: "   " });

    expect(esito.ok).toBe(true);
    if (esito.ok) expect(esito.env.DATABASE_URL).toBeUndefined();
  });

  it("conserva i valori davvero compilati", () => {
    const esito = parseEnv({
      ...ENV_APPENA_COPIATO,
      DATABASE_URL: "postgres://utente:segreto@host/db",
      REFRESH_AFTER_DAYS: "7",
    });

    expect(esito.ok).toBe(true);
    if (esito.ok) {
      expect(esito.env.DATABASE_URL).toBe("postgres://utente:segreto@host/db");
      expect(esito.env.REFRESH_AFTER_DAYS).toBe(7);
    }
  });

  it("rifiuta openapi senza token", () => {
    const esito = parseEnv({ ...ENV_APPENA_COPIATO, COMPANY_PROVIDER: "openapi" });

    expect(esito.ok).toBe(false);
    if (!esito.ok) {
      expect(esito.problemi.join(" ")).toContain("OPENAPI_IT_TOKEN");
    }
  });

  it("accetta openapi con il token", () => {
    const esito = parseEnv({
      ...ENV_APPENA_COPIATO,
      COMPANY_PROVIDER: "openapi",
      OPENAPI_IT_TOKEN: "un-token",
    });

    expect(esito.ok).toBe(true);
  });

  it("rifiuta mezza configurazione di Upstash", () => {
    const esito = parseEnv({
      ...ENV_APPENA_COPIATO,
      UPSTASH_REDIS_REST_URL: "https://esempio.upstash.io",
    });

    expect(esito.ok).toBe(false);
    if (!esito.ok) {
      expect(esito.problemi.join(" ")).toContain("UPSTASH_REDIS_REST_TOKEN");
    }
  });

  it("rifiuta un provider inesistente e una soglia assurda", () => {
    expect(parseEnv({ COMPANY_PROVIDER: "cerved" }).ok).toBe(false);
    expect(parseEnv({ REFRESH_AFTER_DAYS: "0" }).ok).toBe(false);
    expect(parseEnv({ REFRESH_AFTER_DAYS: "9999" }).ok).toBe(false);
  });

  it("elenca i problemi con il nome della variabile", () => {
    const esito = parseEnv({ NEXT_PUBLIC_SITE_URL: "non-un-url" });

    expect(esito.ok).toBe(false);
    if (!esito.ok) {
      expect(esito.problemi[0]).toContain("NEXT_PUBLIC_SITE_URL");
    }
  });
});

describe("indirizzo del sito", () => {
  it("in sviluppo vale localhost", () => {
    const esito = parseEnv({});
    expect(esito.ok && esito.env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("in produzione senza variabile vale il dominio pubblico, mai localhost", () => {
    // è il caso del deploy su Vercel senza variabili impostate
    const esito = parseEnv({ NODE_ENV: "production" });
    expect(esito.ok && esito.env.NEXT_PUBLIC_SITE_URL).toBe(SITO_PRODUZIONE);
    expect(SITO_PRODUZIONE).toMatch(/^https:\/\/www\./);
  });

  it("una variabile impostata vince sempre sul default", () => {
    const esito = parseEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://anteprima.esempio.it",
    });
    expect(esito.ok && esito.env.NEXT_PUBLIC_SITE_URL).toBe("https://anteprima.esempio.it");
  });
});

describe("costo per chiamata", () => {
  it("vale zero finché non si conosce il listino", () => {
    const esito = parseEnv(ENV_APPENA_COPIATO);
    expect(esito.ok && esito.env.OPENAPI_COSTO_PER_CHIAMATA).toBe(0);
  });

  it("accetta il costo reale quando lo si dichiara", () => {
    const esito = parseEnv({
      ...ENV_APPENA_COPIATO,
      OPENAPI_COSTO_PER_CHIAMATA: "0.12",
    });
    expect(esito.ok && esito.env.OPENAPI_COSTO_PER_CHIAMATA).toBe(0.12);
  });

  it("rifiuta un costo negativo", () => {
    expect(parseEnv({ OPENAPI_COSTO_PER_CHIAMATA: "-1" }).ok).toBe(false);
  });
});
