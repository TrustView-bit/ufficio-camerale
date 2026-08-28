import { formatDataIso, formatEuro } from "@/lib/format";
import type { CompanyData } from "@/lib/providers/types";

/**
 * La scheda dei fatti su cui si costruisce la descrizione.
 *
 * È deliberatamente l'unico ingresso del modello: se un'informazione non è
 * qui, non deve comparire nel testo. Il modello «sa» già chi è Eni, e quella
 * conoscenza è esattamente il rischio — una descrizione che integra a memoria
 * produce affermazioni su un'impresa reale che nessuno ha verificato.
 */

export type Fatto = { etichetta: string; valore: string };

const STATO: Record<string, string> = {
  attiva: "attiva",
  inattiva: "iscritta ma non operativa",
  "in-liquidazione": "in liquidazione",
  cessata: "cessata",
};

export function fattiDi(company: CompanyData): Fatto[] {
  const fatti: Fatto[] = [
    { etichetta: "Denominazione", valore: company.denominazione },
  ];

  const aggiungi = (etichetta: string, valore: string | null | undefined) => {
    if (valore) fatti.push({ etichetta, valore });
  };

  aggiungi("Forma giuridica", company.formaGiuridica);
  aggiungi("Stato", STATO[company.statoAttivita]);
  aggiungi("Data di costituzione", formatDataIso(company.dataCostituzione));

  const sede = company.sede;
  if (sede?.comune) {
    aggiungi(
      "Sede legale",
      [sede.comune, sede.provincia && `(${sede.provincia})`]
        .filter(Boolean)
        .join(" "),
    );
  }

  if (company.atecoPrimario) {
    aggiungi(
      "Attività (codice ATECO)",
      company.atecoPrimarioDescrizione
        ? `${company.atecoPrimario} — ${company.atecoPrimarioDescrizione}`
        : company.atecoPrimario,
    );
  }

  aggiungi("Capitale sociale", formatEuro(company.capitaleSociale));

  if (company.dipendenti !== null) {
    aggiungi("Dipendenti", String(company.dipendenti));
  }

  const bilancio = company.bilanci
    .filter((voce) => voce.fatturato !== null)
    .sort((a, b) => b.anno - a.anno)[0];

  if (bilancio) {
    aggiungi(`Fatturato ${bilancio.anno}`, formatEuro(bilancio.fatturato));
  }

  if (company.unitaLocali.length > 0) {
    aggiungi("Unità locali", String(company.unitaLocali.length));
  }

  return fatti;
}

/**
 * Con troppo poco non si scrive nulla.
 *
 * Una descrizione costruita su denominazione e comune sarebbe una parafrasi
 * del titolo della pagina: costa una chiamata e non aggiunge niente. Meglio
 * nessuna descrizione che una descrizione vuota di contenuto.
 */
export function fattiSufficienti(fatti: Fatto[]): boolean {
  return fatti.length >= 5;
}

/**
 * Le cifre che il testo può contenere, in forma normalizzata.
 *
 * Serve al controllo successivo alla generazione: qualsiasi numero che non
 * compaia qui è un numero che il modello si è inventato.
 */
export function numeriAmmessi(fatti: Fatto[]): Set<string> {
  const numeri = new Set<string>();

  for (const fatto of fatti) {
    for (const gruppo of estraiNumeri(`${fatto.etichetta} ${fatto.valore}`)) {
      numeri.add(gruppo);
    }
  }

  return numeri;
}

/** Le sequenze di cifre di un testo, senza separatori: "1.234,00" → "123400". */
export function estraiNumeri(testo: string): string[] {
  return (testo.match(/\d[\d.,\s]*\d|\d/g) ?? []).map((grezzo) =>
    grezzo.replace(/\D/g, ""),
  );
}
