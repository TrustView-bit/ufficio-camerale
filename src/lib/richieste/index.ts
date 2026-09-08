import "server-only";

import { getDb } from "@/lib/db";

import { salvaRichiesta } from "./archivio";
import type { Richiesta } from "./schema";

export * from "./archivio";
export * from "./schema";

export function registraRichiesta(richiesta: Richiesta) {
  return salvaRichiesta(getDb(), richiesta);
}
