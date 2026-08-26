import "server-only";

import { env } from "@/lib/env";

import { MockCompanyProvider } from "./mock";
import { OpenapiCompanyProvider } from "./openapi";
import type { CompanyProvider } from "./types";

export * from "./types";
export { MockCompanyProvider, MOCK_PARTITE_IVA } from "./mock";
export { OpenapiCompanyProvider } from "./openapi";

let cached: CompanyProvider | null = null;

/**
 * Il provider camerale configurato.
 *
 * Per aggiungerne uno nuovo (Cerved, InfoCamere, Atoka): implementa
 * `CompanyProvider` in un file di questa cartella, aggiungi il nome
 * all'enum `COMPANY_PROVIDER` in `src/lib/env.ts` e un ramo qui sotto.
 * Nient'altro nel progetto deve cambiare.
 */
export function getCompanyProvider(): CompanyProvider {
  if (cached) return cached;

  switch (env.COMPANY_PROVIDER) {
    case "openapi":
      cached = new OpenapiCompanyProvider(env.OPENAPI_IT_TOKEN!);
      break;
    case "mock":
      cached = new MockCompanyProvider();
      break;
  }

  return cached;
}
