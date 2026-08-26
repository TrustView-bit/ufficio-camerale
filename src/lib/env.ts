import "server-only";

import { parseEnv, type Env } from "./env-schema";

export type { Env } from "./env-schema";

/**
 * Variabili d'ambiente del server, validate una sola volta all'avvio.
 *
 * Il principio è fallire subito e con un messaggio leggibile: meglio un
 * errore in fase di boot che una chiamata a pagamento che parte con un token
 * vuoto, o una cache che silenziosamente non cachea nulla.
 *
 * Le integrazioni non ancora attivate sono facoltative: senza `DATABASE_URL`
 * o senza Upstash il portale funziona lo stesso, solo senza persistenza e
 * senza cache condivisa.
 */
function carica(): Env {
  const esito = parseEnv(process.env);

  if (!esito.ok) {
    throw new Error(
      `Configurazione d'ambiente non valida:\n` +
        esito.problemi.map((problema) => `  • ${problema}`).join("\n") +
        `\n\nControlla il file .env.local — vedi .env.example.`,
    );
  }

  return esito.env;
}

export const env = carica();

/** Le integrazioni effettivamente disponibili con questa configurazione. */
export const features = {
  database: Boolean(env.DATABASE_URL),
  redis: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  descriptions: Boolean(env.ANTHROPIC_API_KEY),
} as const;
