import { z } from "zod";

/**
 * Schema delle variabili d'ambiente, separato da `env.ts` perché quello
 * importa "server-only" e non sarebbe caricabile dai test.
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
    /**
     * Costo reale di una chiamata, dal listino del fornitore.
     *
     * Il valore predefinito è 0 di proposito: finché non è noto il listino,
     * scrivere una cifra inventata nella colonna dei costi produce un totale
     * che sembra una spesa e non lo è. Meglio contare le chiamate — dato
     * certo — e lasciare l'importo a zero finché non lo si sa.
     */
    OPENAPI_COSTO_PER_CHIAMATA: z.coerce.number().nonnegative().default(0),

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

/**
 * Una variabile scritta ma lasciata vuota vale come assente.
 *
 * Copiando `.env.example` in `.env.local` tutte le variabili facoltative
 * diventano stringhe vuote: senza questo passaggio l'applicazione si
 * rifiuterebbe di partire proprio seguendo le istruzioni del README.
 */
function scartaVuote(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      ([, valore]) => !(typeof valore === "string" && valore.trim() === ""),
    ),
  );
}

export type EsitoEnv = { ok: true; env: Env } | { ok: false; problemi: string[] };

/** Valida l'ambiente senza lanciare: comodo da testare. */
export function parseEnv(input: unknown): EsitoEnv {
  const risultato = schema.safeParse(scartaVuote(input));

  if (risultato.success) return { ok: true, env: risultato.data };

  return {
    ok: false,
    problemi: risultato.error.issues.map(
      (problema) => `${problema.path.join(".") || "(radice)"}: ${problema.message}`,
    ),
  };
}
