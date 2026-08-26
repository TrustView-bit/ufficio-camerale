import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

import { env, features } from "@/lib/env";

import {
  MemoryRateLimiter,
  type RateLimiter,
  type RateLimitResult,
  type RateLimitRule,
} from "./memory";

export type { RateLimitResult, RateLimitRule } from "./memory";
export { MemoryRateLimiter } from "./memory";

/** Dieci ricerche al minuto, cento al giorno, per indirizzo IP. */
export const REGOLE: RateLimitRule[] = [
  { nome: "minuto", limite: 10, finestraMs: 60_000 },
  { nome: "giorno", limite: 100, finestraMs: 86_400_000 },
];

/** Limitatore distribuito su Upstash: conta correttamente fra più istanze. */
class UpstashRateLimiter implements RateLimiter {
  private readonly limiters: Ratelimit[];

  constructor(redis: Redis, regole: RateLimitRule[]) {
    this.limiters = regole.map(
      (regola) =>
        new Ratelimit({
          redis,
          prefix: `rl:${regola.nome}`,
          analytics: false,
          limiter: Ratelimit.slidingWindow(
            regola.limite,
            `${Math.round(regola.finestraMs / 1000)} s`,
          ),
        }),
    );
  }

  async check(identificatore: string): Promise<RateLimitResult> {
    try {
      const esiti = await Promise.all(
        this.limiters.map((limiter) => limiter.limit(identificatore)),
      );

      const bloccante = esiti.find((esito) => !esito.success);
      const scelto =
        bloccante ?? esiti.reduce((a, b) => (a.remaining <= b.remaining ? a : b));

      return {
        success: !bloccante,
        limit: scelto.limit,
        remaining: scelto.remaining,
        reset: scelto.reset,
      };
    } catch {
      // Se Redis è irraggiungibile si lascia passare: un limite che non
      // funziona non deve trasformarsi in un blocco totale del servizio.
      return {
        success: true,
        limit: REGOLE[0]!.limite,
        remaining: REGOLE[0]!.limite,
        reset: Date.now() + REGOLE[0]!.finestraMs,
      };
    }
  }
}

let cached: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (cached) return cached;

  cached = features.redis
    ? new UpstashRateLimiter(
        new Redis({
          url: env.UPSTASH_REDIS_REST_URL!,
          token: env.UPSTASH_REDIS_REST_TOKEN!,
        }),
        REGOLE,
      )
    : new MemoryRateLimiter(REGOLE);

  return cached;
}

/**
 * Identifica il chiamante.
 *
 * `x-forwarded-for` è attendibile solo perché su Vercel lo imposta la
 * piattaforma, sovrascrivendo quanto invia il client. Dietro un altro proxy
 * questa assunzione va verificata prima di fidarsene.
 */
export function identificaChiamante(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "sconosciuto";
}

/** Intestazioni standard da allegare a ogni risposta soggetta a limite. */
export function intestazioniLimite(esito: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(esito.limit),
    "RateLimit-Remaining": String(esito.remaining),
    "RateLimit-Reset": String(
      Math.max(0, Math.ceil((esito.reset - Date.now()) / 1000)),
    ),
  };
}
