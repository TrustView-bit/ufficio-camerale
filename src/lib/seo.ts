import "server-only";

import { env } from "@/lib/env";

/**
 * Le schede e gli elenchi costruiti sul provider dimostrativo non devono
 * finire nei motori di ricerca: contengono aziende inventate. Quando sarà
 * configurato un fornitore reale, l'indicizzazione si attiva da sola.
 */
export const DATI_REALI = env.COMPANY_PROVIDER !== "mock";

export const ROBOTS_SE_DIMOSTRATIVO = DATI_REALI
  ? undefined
  : { index: false, follow: true };
