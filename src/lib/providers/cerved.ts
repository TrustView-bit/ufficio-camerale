import type { CompanyProvider, ProviderResult } from "./types";

/**
 * Adapter Cerved — segnaposto.
 *
 * Cerved e InfoCamere offrono dati più completi di openapi.it a un costo
 * sensibilmente più alto. La struttura è già quella giusta: basta riempire
 * `getByPartitaIva` e registrare il provider nella factory in `index.ts`.
 *
 * Ricordarsi di: validare la risposta con zod, mappare gli stati HTTP sui
 * motivi di `ProviderUnavailableReason`, e non lanciare mai.
 */
export class CervedCompanyProvider implements CompanyProvider {
  readonly name = "cerved";
  readonly costPerLookupEur = 0;

  async getByPartitaIva(): Promise<ProviderResult> {
    return { status: "unavailable", reason: "SERVICE_UNAVAILABLE" };
  }
}
