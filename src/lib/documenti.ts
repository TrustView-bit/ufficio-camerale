/**
 * Catalogo dei documenti camerali ordinabili.
 *
 * ⚠️ I prezzi sono SEGNAPOSTO: non esiste ancora un fornitore collegato, né un
 * incasso. Vanno sostituiti con il listino reale prima di attivare qualunque
 * acquisto, e l'interfaccia dichiara apertamente che l'ordine non è attivo.
 */

export type Documento = {
  id: string;
  nome: string;
  descrizione: string;
  /** Prezzo indicativo in euro, IVA esclusa. */
  prezzo: number;
  /** Alcuni documenti esistono solo per le società di capitali. */
  soloSocieta?: boolean;
};

export const DOCUMENTI: Documento[] = [
  {
    id: "visura-ordinaria",
    nome: "Visura camerale ordinaria",
    descrizione:
      "La fotografia attuale dell'impresa nel Registro Imprese: sede, attività, cariche, capitale e stato.",
    prezzo: 7.8,
  },
  {
    id: "visura-storica",
    nome: "Visura camerale storica",
    descrizione:
      "Tutte le variazioni registrate dalla costituzione a oggi: sedi, denominazioni, amministratori.",
    prezzo: 10.6,
  },
  {
    id: "visura-inglese",
    nome: "Visura ordinaria in inglese",
    descrizione: "La visura ordinaria tradotta, per controparti e banche estere.",
    prezzo: 14.5,
  },
  {
    id: "bilancio",
    nome: "Ultimo bilancio depositato",
    descrizione:
      "Stato patrimoniale, conto economico e nota integrativa dell'ultimo esercizio.",
    prezzo: 9.4,
    soloSocieta: true,
  },
  {
    id: "elenco-soci",
    nome: "Elenco soci",
    descrizione:
      "Compagine sociale con le quote di partecipazione e i relativi trasferimenti.",
    prezzo: 8.9,
    soloSocieta: true,
  },
  {
    id: "atto-costitutivo",
    nome: "Atto costitutivo e statuto",
    descrizione: "Gli atti depositati che regolano la vita della società.",
    prezzo: 16.2,
    soloSocieta: true,
  },
  {
    id: "protesti",
    nome: "Situazione protesti",
    descrizione:
      "Verifica della presenza di protesti nel Registro Informatico dei Protesti.",
    prezzo: 6.5,
  },
  {
    id: "fascicolo",
    nome: "Fascicolo completo dell'impresa",
    descrizione:
      "Visura storica, bilanci, atti e partecipazioni raccolti in un unico documento.",
    prezzo: 39.0,
  },
];

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatPrezzo(prezzo: number): string {
  return EURO.format(prezzo);
}

/** I documenti ordinabili per una data impresa. */
export function documentiPer({ eSocieta }: { eSocieta: boolean }): Documento[] {
  return DOCUMENTI.filter((documento) => !documento.soloSocieta || eSocieta);
}
