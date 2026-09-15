import { anniDi, formatDataIso, formatEuro, formatIndirizzo } from "@/lib/format";
import type { CompanyData } from "@/lib/providers/types";

/**
 * I testi SEO della scheda azienda, generati dai soli dati presenti.
 *
 * L'impianto è quello che oggi Google e la sua AI Overview premiano sulle
 * schede dei portali dati (misurato il 5/9/2026 su «eni spa partita iva»):
 * il titolo con nome + Partita IVA + i dati più cercati, e in apertura una
 * frase-fatto «<numero> è la Partita IVA di <nome>. <nome> ha sede in …»
 * che l'AI può citare senza interpretare.
 *
 * Regola unica: un dato che manca produce una frase in meno, mai una frase
 * vaga. Qui non si scrive nulla che non stia già nella scheda.
 */

const STATO_TESTO: Record<CompanyData["statoAttivita"], string | null> = {
  attiva: "risulta attiva",
  inattiva: "risulta iscritta ma non operativa",
  "in-liquidazione": "risulta in liquidazione",
  cessata: "risulta cessata",
  sconosciuto: null,
};

/** Il nome come lo scrive il Registro, ma senza urlare: "ENI S.P.A." resta. */
function nome(company: CompanyData): string {
  return company.denominazione.trim();
}

function rea(company: CompanyData): string | null {
  if (!company.reaNumero) return null;
  return company.reaCciaa
    ? `${company.reaCciaa}-${company.reaNumero}`
    : company.reaNumero;
}

function ultimoBilancio(company: CompanyData) {
  return company.bilanci
    .filter((b) => b.fatturato !== null)
    .sort((a, b) => b.anno - a.anno)[0];
}

/** Oltre questa misura Google taglia il titolo nei risultati. */
const TITOLO_MAX = 70;
/** Oltre questa misura Google taglia la description nei risultati. */
const DESCRIZIONE_MAX = 160;

/**
 * Titolo della pagina: nome e P.IVA sempre, poi i dati che la scheda ha
 * nell'ordine in cui la gente li cerca (misurato su «eni»: fatturato, PEC,
 * sede, REA), ognuno solo se il titolo resta nei caratteri che Google mostra.
 */
export function titoloScheda(company: CompanyData): string {
  const candidati: string[] = [];
  if (ultimoBilancio(company)) candidati.push("fatturato");
  if (company.pec) candidati.push("PEC");
  if (company.sede?.comune) candidati.push(`sede a ${company.sede.comune}`);
  const numeroRea = rea(company);
  if (numeroRea) candidati.push(`REA ${numeroRea}`);

  let titolo = `${nome(company)} – Partita IVA ${company.partitaIva}`;
  for (const parte of candidati) {
    const esteso = `${titolo}, ${parte}`;
    if (esteso.length <= TITOLO_MAX) titolo = esteso;
  }
  return titolo;
}

/**
 * Meta description: la prima frase-fatto, poi l'elenco di ciò che la scheda
 * ha, una voce alla volta finché si resta nei caratteri che Google mostra.
 */
export function descrizioneScheda(company: CompanyData): string {
  const prima = frasiFatto(company)[0]!;
  const disponibili: string[] = [];
  const bilancio = ultimoBilancio(company);
  if (bilancio) disponibili.push(`fatturato ${bilancio.anno}`);
  if (company.pec) disponibili.push("PEC");
  if (rea(company)) disponibili.push("numero REA");
  if (company.codiceFiscale) disponibili.push("codice fiscale");
  if (company.atecoPrimario) disponibili.push("codice ATECO");
  if (company.capitaleSociale) disponibili.push("capitale sociale");

  const componi = (voci: string[]) =>
    `${prima} ${maiuscola(voci.join(", "))} e dati camerali.`;
  const scelte: string[] = [];
  for (const voce of disponibili) {
    if (componi([...scelte, voce]).length <= DESCRIZIONE_MAX) scelte.push(voce);
  }
  if (scelte.length > 0) return componi(scelte);
  if (prima.length <= DESCRIZIONE_MAX) return prima;
  return `${prima.slice(0, DESCRIZIONE_MAX - 1).replace(/\s+\S*$/, "")}…`;
}

function maiuscola(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

/**
 * Le frasi-fatto di apertura, una per dato: ognuna copre una ricerca
 * («<nome> partita iva», «<nome> sede legale», «<nome> rea», il numero nudo).
 */
export function frasiFatto(company: CompanyData, now = new Date()): string[] {
  const n = nome(company);
  const frasi: string[] = [];

  frasi.push(
    company.codiceFiscale && company.codiceFiscale !== company.partitaIva
      ? `${company.partitaIva} è la Partita IVA di ${n} (codice fiscale ${company.codiceFiscale}).`
      : `${company.partitaIva} è la Partita IVA di ${n}${
          company.codiceFiscale ? ", che coincide con il codice fiscale" : ""
        }.`,
  );

  const forma = company.formaGiuridica
    ? `${maiuscola(company.formaGiuridica.toLowerCase())}`
    : null;
  const indirizzo = formatIndirizzo(company.sede);
  const stato = STATO_TESTO[company.statoAttivita];

  if (indirizzo || forma || stato) {
    const pezzi: string[] = [];
    if (forma) pezzi.push(`è una ${forma.toLowerCase()}`);
    if (indirizzo) pezzi.push(`ha sede legale in ${indirizzo}`);
    if (stato) pezzi.push(stato);
    frasi.push(`${n} ${pezzi.join(", ")}.`);
  }

  const numeroRea = rea(company);
  if (numeroRea) {
    const iscrizione = formatDataIso(company.dataCostituzione);
    frasi.push(
      `È iscritta al Registro Imprese${
        company.reaCciaa ? ` di ${company.reaCciaa}` : ""
      } con numero REA ${numeroRea}${iscrizione ? `, dal ${iscrizione}` : ""}.`,
    );
  } else if (company.dataCostituzione) {
    const anni = anniDi(company.dataCostituzione, now);
    frasi.push(
      `È stata costituita il ${formatDataIso(company.dataCostituzione)}${
        anni !== null && anni > 0 ? ` (${anni} anni di attività)` : ""
      }.`,
    );
  }

  if (company.atecoPrimario) {
    frasi.push(
      `Il codice ATECO è ${company.atecoPrimario}${
        company.atecoPrimarioDescrizione
          ? ` – ${company.atecoPrimarioDescrizione}`
          : ""
      }.`,
    );
  }

  const bilancio = ultimoBilancio(company);
  if (bilancio) {
    const dipendenti =
      bilancio.dipendenti ?? company.dipendenti;
    frasi.push(
      `Nel ${bilancio.anno} ha dichiarato un fatturato di ${formatEuro(bilancio.fatturato)}${
        dipendenti !== null && dipendenti !== undefined
          ? ` con ${dipendenti.toLocaleString("it-IT")} dipendenti`
          : ""
      }.`,
    );
  }

  if (company.pec) frasi.push(`La PEC è ${company.pec}.`);

  return frasi;
}

export type Domanda = { domanda: string; risposta: string };

/**
 * Le domande che la gente fa a Google su un'azienda («People also ask»
 * misurate: partita IVA, codice fiscale, sede legale, PEC, REA, ATECO,
 * fatturato). Ogni risposta è una riga e viene dai dati.
 */
export function domandeFrequenti(company: CompanyData): Domanda[] {
  const n = nome(company);
  const domande: Domanda[] = [
    {
      domanda: `Qual è la Partita IVA di ${n}?`,
      risposta: `La Partita IVA di ${n} è ${company.partitaIva} (VAT europeo IT${company.partitaIva}).`,
    },
  ];

  if (company.codiceFiscale) {
    domande.push({
      domanda: `Qual è il codice fiscale di ${n}?`,
      risposta: `Il codice fiscale di ${n} è ${company.codiceFiscale}.`,
    });
  }

  const indirizzo = formatIndirizzo(company.sede);
  if (indirizzo) {
    domande.push({
      domanda: `Dove ha sede legale ${n}?`,
      risposta: `${n} ha sede legale in ${indirizzo}.`,
    });
  }

  if (company.pec) {
    domande.push({
      domanda: `Qual è la PEC di ${n}?`,
      risposta: `L'indirizzo PEC di ${n} è ${company.pec}.`,
    });
  }

  const numeroRea = rea(company);
  if (numeroRea) {
    domande.push({
      domanda: `Qual è il numero REA di ${n}?`,
      risposta: `Il numero REA di ${n} è ${numeroRea}.`,
    });
  }

  if (company.atecoPrimario) {
    domande.push({
      domanda: `Di cosa si occupa ${n}?`,
      risposta: `${n} è classificata con il codice ATECO ${company.atecoPrimario}${
        company.atecoPrimarioDescrizione
          ? `: ${company.atecoPrimarioDescrizione}`
          : ""
      }.`,
    });
  }

  const bilancio = ultimoBilancio(company);
  if (bilancio) {
    domande.push({
      domanda: `Quanto fattura ${n}?`,
      risposta: `Nel ${bilancio.anno} ${n} ha dichiarato un fatturato di ${formatEuro(bilancio.fatturato)}.`,
    });
  }

  const stato = STATO_TESTO[company.statoAttivita];
  if (stato) {
    domande.push({
      domanda: `${n} è ancora attiva?`,
      risposta: `Secondo il Registro Imprese ${n} ${stato}.`,
    });
  }

  return domande;
}

/**
 * «È affidabile?» — la domanda che la gente si fa, risposta con i soli fatti
 * pubblici che la scheda ha. Nessun giudizio: si elencano gli indizi e si
 * dice cosa sono. Vuoto quando i fatti sono meno di due.
 */
export function indiziAffidabilita(company: CompanyData, now = new Date()): string[] {
  const indizi: string[] = [];
  const stato = STATO_TESTO[company.statoAttivita];
  if (stato) indizi.push(`Stato nel Registro Imprese: ${stato.replace("risulta ", "")}.`);

  const anni = anniDi(company.dataCostituzione, now);
  if (anni !== null && anni > 0) {
    indizi.push(
      `Attiva da ${anni} ${anni === 1 ? "anno" : "anni"} (costituita nel ${company.dataCostituzione!.slice(0, 4)}).`,
    );
  }

  const capitale = formatEuro(company.capitaleSociale);
  if (capitale) indizi.push(`Capitale sociale: ${capitale}.`);

  const conFatturato = company.bilanci
    .filter((b) => b.fatturato !== null && b.fatturato > 0)
    .sort((a, b) => b.anno - a.anno);
  if (conFatturato.length >= 2) {
    const [ultimo, precedente] = conFatturato as [
      (typeof conFatturato)[number],
      (typeof conFatturato)[number],
    ];
    const variazione =
      ((ultimo.fatturato! - precedente.fatturato!) / precedente.fatturato!) * 100;
    const verso = variazione >= 0 ? "in aumento" : "in calo";
    indizi.push(
      `Fatturato ${ultimo.anno}: ${formatEuro(ultimo.fatturato)}, ${verso} del ${Math.abs(variazione).toLocaleString("it-IT", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}% rispetto al ${precedente.anno}. Bilanci depositati: ${conFatturato.length}.`,
    );
  } else if (conFatturato.length === 1) {
    indizi.push(
      `Ultimo bilancio depositato: ${conFatturato[0]!.anno}, fatturato ${formatEuro(
        conFatturato[0]!.fatturato,
      )}.`,
    );
  }

  const dipendenti = company.dipendenti ?? conFatturato[0]?.dipendenti ?? null;
  if (dipendenti !== null) indizi.push(`Dipendenti dichiarati: ${dipendenti.toLocaleString("it-IT")}.`);

  if (company.unitaLocali.length > 0) {
    indizi.push(
      `${company.unitaLocali.length} ${
        company.unitaLocali.length === 1 ? "unità locale" : "unità locali"
      } oltre alla sede.`,
    );
  }

  if (company.pec) indizi.push("Ha una PEC registrata, come richiesto alle imprese iscritte.");

  return indizi.length >= 2 ? indizi : [];
}
