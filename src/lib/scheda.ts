import type { CompanyData } from "@/lib/providers/types";

/**
 * Quanto una scheda ha da dire.
 *
 * Circa quattro imprese reali su dieci arrivano dagli elenchi pubblici con la
 * sola denominazione e l'indirizzo: la loro pagina è corretta ma quasi vuota.
 * Proporla ai motori di ricerca non conviene a nessuno — chi ci arriva non
 * trova quello che cercava, e molte pagine sottili su un dominio nuovo ne
 * abbassano la reputazione complessiva.
 *
 * Il conteggio guarda ai campi che distinguono una scheda da un elenco
 * telefonico: la sede da sola non basta, perché ce l'hanno tutte.
 */
export function datiSostanziali(company: CompanyData): number {
  const presenti = [
    company.formaGiuridica,
    company.dataCostituzione,
    company.reaNumero,
    company.capitaleSociale,
    company.atecoPrimario,
    company.pec,
    company.sitoWeb,
    company.telefono,
    company.dipendenti,
    company.bilanci.length > 0 ? true : null,
    company.unitaLocali.length > 0 ? true : null,
  ];

  return presenti.filter(
    (valore) => valore !== null && valore !== undefined && valore !== "",
  ).length;
}

/** Sotto questa soglia la scheda non ha abbastanza contenuto per l'indice. */
export const SOGLIA_INDICIZZAZIONE = 3;

/**
 * `follow` resta vero anche quando `index` è falso: la pagina non merita di
 * comparire nei risultati, ma i suoi collegamenti verso comune e settore
 * restano utili al motore per percorrere l'archivio.
 */
export function schedaIndicizzabile(company: CompanyData): boolean {
  if (company.fittizia) return false;
  return datiSostanziali(company) >= SOGLIA_INDICIZZAZIONE;
}
