import "server-only";

import { getCache } from "@/lib/cache";
import { getDb } from "@/lib/db";
import type { CompanyData } from "@/lib/providers/types";

import { clienteAnthropic } from "./anthropic";
import {
  generaESalvaDescrizione,
  leggiDescrizione,
  type DepsDescrizione,
} from "./archivio";

export * from "./archivio";
export * from "./fatti";
export * from "./genera";
export * from "./verifica";

/**
 * Le descrizioni si generano **su richiesta**, mai in blocco.
 *
 * Con quasi duemila imprese in archivio, generarle tutte sarebbe una spesa
 * certa per un beneficio ipotetico: la maggior parte delle schede non viene
 * mai aperta. Qui la prima visita programma la generazione e mostra la scheda
 * senza attendere; dalla seconda in poi il testo è già lì.
 */
function dipendenze(): DepsDescrizione {
  return { cache: getCache(), db: getDb(), cliente: clienteAnthropic() };
}

export function descrizioneSalvata(partitaIva: string): Promise<string | null> {
  return leggiDescrizione(partitaIva, dipendenze());
}

export function generaESalva(company: CompanyData): Promise<void> {
  return generaESalvaDescrizione(company, dipendenze());
}
