import type { Metadata } from "next";

/**
 * Title e canonical di una pagina d'elenco.
 *
 * Ogni pagina della paginazione ha titolo e canonical propri: canonicalizzare
 * tutto sulla prima nasconderebbe a Google le aziende dalla seconda in poi, e
 * titoli identici su URL diversi vengono letti come duplicati.
 */
export function metaElenco(titolo: string, percorso: string, pagina: number): Metadata {
  const n = Number.isFinite(pagina) && pagina > 1 ? Math.floor(pagina) : 1;
  return {
    title: n > 1 ? `${titolo} – pagina ${n}` : titolo,
    alternates: { canonical: n > 1 ? `${percorso}?pagina=${n}` : percorso },
  };
}
