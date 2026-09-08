"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "catalogo-imprese:ricerche-recenti";
const MAX_RECENT = 5;
const EMPTY: readonly string[] = [];

/** Evento interno: `storage` non scatta nella scheda che ha scritto. */
const CHANGE_EVENT = "catalogo-imprese:recenti";

// useSyncExternalStore richiede uno snapshot referenzialmente stabile:
// teniamo in cache l'ultimo array insieme alla stringa da cui deriva.
let cachedRaw: string | null = null;
let cachedValue: readonly string[] = EMPTY;

function readStorage(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage può essere disabilitato (navigazione privata, policy)
    return EMPTY;
  }

  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;

  if (!raw) {
    cachedValue = EMPTY;
    return cachedValue;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    cachedValue = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }

  return cachedValue;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Ricerche recenti dell'utente, conservate solo nel suo browser: non vengono
 * mai inviate al server.
 */
export function useRecentSearches() {
  const recent = useSyncExternalStore(subscribe, readStorage, () => EMPTY);

  const push = useCallback((query: string) => {
    const value = query.trim();
    if (!value) return;

    const next = [value, ...readStorage().filter((item) => item !== value)].slice(
      0,
      MAX_RECENT,
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { recent, push, clear };
}
