import "server-only";

import { z } from "zod";

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
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

    /** Neon o Vercel Postgres. Assente: archivio disattivato. */
    DATABASE_URL: z.string().min(1).optional(),

    /** Upstash Redis. Assenti: cache in memoria, solo per lo sviluppo. */
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    COMPANY_PROVIDER: z.enum(["mock", "openapi"]).default("mock"),
    OPENAPI_IT_TOKEN: z.string().min(1).optional(),

    /** Dopo quanti giorni un record in archivio è considerato stantio. */
    REFRESH_AFTER_DAYS: z.coerce.number().int().positive().max(365).default(30),

    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_MODEL: z.string().min(1).default("claude-haiku-4-5-20251001"),
  })
  .superRefine((env, ctx) => {
    if (env.COMPANY_PROVIDER === "openapi" && !env.OPENAPI_IT_TOKEN) {
      ctx.addIssue({
        code: "custom",
        path: ["OPENAPI_IT_TOKEN"],
        message:
          "COMPANY_PROVIDER=openapi richiede OPENAPI_IT_TOKEN: senza token ogni interrogazione fallirebbe.",
      });
    }

    // Le due variabili di Upstash vanno insieme: una sola non serve a nulla
    const hasUrl = Boolean(env.UPSTASH_REDIS_REST_URL);
    const hasToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN);
    if (hasUrl !== hasToken) {
      ctx.addIssue({
        code: "custom",
        path: [hasUrl ? "UPSTASH_REDIS_REST_TOKEN" : "UPSTASH_REDIS_REST_URL"],
        message:
          "UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN vanno configurate entrambe o nessuna delle due.",
      });
    }
  });

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(radice)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configurazione d'ambiente non valida:\n${details}\n\nControlla il file .env.local — vedi .env.example.`,
    );
  }

  return parsed.data;
}

export const env = load();

/** Le integrazioni effettivamente disponibili con questa configurazione. */
export const features = {
  database: Boolean(env.DATABASE_URL),
  redis: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  descriptions: Boolean(env.ANTHROPIC_API_KEY),
} as const;
