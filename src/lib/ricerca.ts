/**
 * Confronto fra il testo digitato e le denominazioni.
 *
 * Le ragioni sociali sono piene di forme societarie ("S.R.L.", "SOCIETA' A
 * RESPONSABILITA' LIMITATA"), punteggiatura e accenti: confrontare le stringhe
 * così come sono non troverebbe quasi nulla.
 */

/**
 * Riduce un testo alla forma confrontabile: niente accenti, niente segni.
 *
 * Le sigle puntate vengono ricomposte in una parola sola — "S.P.A." diventa
 * "spa", "A.D.R." diventa "adr". Senza questo passaggio chi scrive "eni spa"
 * non troverebbe ENI S.P.A., perché la denominazione si ridurrebbe a
 * "eni s p a", dove la sequenza "spa" non compare.
 */
export function chiaveRicerca(testo: string): string {
  return (
    testo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      // due o più lettere isolate di seguito sono una sigla: si uniscono
      .replace(/\b(?:[a-z] )+[a-z]\b/g, (sigla) => sigla.replace(/ /g, ""))
  );
}

/** Le parole della denominazione, già normalizzate. */
function parole(testo: string): string[] {
  return chiaveRicerca(testo).split(" ").filter(Boolean);
}

/** true se la parola apre una delle parole del nome. */
function apreUnaParola(paroleNome: string[], cercata: string): boolean {
  return paroleNome.some((parola) => parola.startsWith(cercata));
}

/**
 * Quanto bene una denominazione risponde alla ricerca.
 * 0 = non pertinente. Più alto = più pertinente.
 *
 * La distinzione che conta è fra una parola che **apre** una parola del nome
 * e una che capita in mezzo a un'altra: chi cerca "eni" vuole ENI, non THALES
 * ALENIA SPACE. La corrispondenza interna resta valida — serve a chi cerca
 * "paolo" in "Sanpaolo" — ma vale molto meno.
 */
export function punteggio(denominazione: string, query: string): number {
  const nome = chiaveRicerca(denominazione);
  const paroleNome = nome.split(" ").filter(Boolean);
  const cercate = parole(query);

  if (cercate.length === 0) return 0;
  // tutte le parole digitate devono comparire: chi cerca due parole non vuole
  // i risultati che ne contengono una sola
  if (!cercate.every((parola) => nome.includes(parola))) return 0;

  const unite = cercate.join(" ");

  if (nome === unite) return 100;
  if (nome.startsWith(`${unite} `)) return 85;

  const tutteAperture = cercate.every((parola) =>
    apreUnaParola(paroleNome, parola),
  );

  if (tutteAperture) {
    // il nome comincia con la prima parola digitata: è quasi sempre l'azienda
    // che si stava cercando
    return paroleNome[0]?.startsWith(cercate[0]!) ? 70 : 55;
  }

  // nessuna apertura: la corrispondenza è dentro altre parole
  return 20;
}
