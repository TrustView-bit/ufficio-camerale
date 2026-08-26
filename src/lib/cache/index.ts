import "server-only";

import { Redis } from "@upstash/redis";

import { env, features } from "@/lib/env";

import { MemoryCache, RedisCache, type CacheStore } from "./store";

export { MemoryCache, RedisCache } from "./store";
export type { CacheStore } from "./store";

let cached: CacheStore | null = null;

export function getCache(): CacheStore {
  if (cached) return cached;

  cached = features.redis
    ? new RedisCache(
        new Redis({
          url: env.UPSTASH_REDIS_REST_URL!,
          token: env.UPSTASH_REDIS_REST_TOKEN!,
        }),
      )
    : new MemoryCache();

  return cached;
}
