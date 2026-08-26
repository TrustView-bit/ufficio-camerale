import type { Redis } from "@upstash/redis";

/** Cache calda: chiave → valore JSON con scadenza. */
export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * Ripiego usato quando Upstash non è configurato: vive nel processo, non è
 * condivisa fra le istanze serverless e sparisce a ogni riavvio. Va bene per
 * lo sviluppo locale e per i test, non per la produzione.
 */
export class MemoryCache implements CacheStore {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Cache su Upstash Redis. Un guasto della cache non deve mai far fallire una
 * richiesta: in caso di errore si degrada come se fosse un miss.
 */
export class RedisCache implements CacheStore {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      return (await this.redis.get<T>(key)) ?? null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, { ex: ttlSeconds });
    } catch {
      // una scrittura persa costa una chiamata in più, non un errore all'utente
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // idem
    }
  }
}
