/**
 * Confronto fra il testo digitato e le denominazioni.
 *
 * Le ragioni sociali sono piene di forme societarie ("S.R.L.", "SOCIETA' A
 * RESPONSABILITA' LIMITATA"), punteggiatura e accenti: confrontare le stringhe
 * così come sono non troverebbe quasi nulla.
 */

/** Riduce un testo alla forma confrontabile: niente accenti, niente segni. */
export function chiaveRicerca(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Quanto bene una denominazione risponde alla ricerca.
 * 0 = non pertinente. Più alto = più pertinente.
 */
export function punteggio(denominazione: string, query: string): number {
  const nome = chiaveRicerca(denominazione);
  const parole = chiaveRicerca(query).split(" ").filter(Boolean);

  if (parole.length === 0) return 0;
  // tutte le parole digitate devono comparire: chi cerca due parole non vuole
  // i risultati che ne contengono una sola
  if (!parole.every((parola) => nome.includes(parola))) return 0;

  const unite = parole.join(" ");
  if (nome === unite) return 100;
  if (nome.startsWith(unite)) return 80;
  if (nome.split(" ").some((parola) => parola === parole[0])) return 60;
  return 40;
}
