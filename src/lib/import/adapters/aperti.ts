import { colonna, leggiCsv } from "../csv";

/**
 * Fonti aperte: dati veri, riutilizzabili senza contratto, ma **parziali**.
 *
 * Sono elenchi di soggetti, non visure: ci si trovano codice fiscale e
 * denominazione, e poco altro. Servono a costruire l'indice di partenza, non
 * le schede — e infatti hanno priorità bassa quando un altro elenco fornisce
 * lo stesso campo.
 */

/**
 * IPA — Indice dei domicili digitali della Pubblica Amministrazione.
 * Poche migliaia di enti, ma completi e puliti: c'è anche la PEC.
 */
export function parseIpaCsv(
  contenuto: Buffer,
  dataAcquisizione: string,
): unknown[] {
  const { righe } = leggiCsv(contenuto);

  return righe
    .map((riga) => {
      const codiceFiscale = colonna(
        riga,
        "Codice_fiscale_ente",
        "codicefiscale",
        "cf",
      );
      const denominazione = colonna(
        riga,
        "Denominazione_ente",
        "denominazione",
        "descrizioneente",
      );

      // gli enti hanno un codice fiscale a 11 cifre come le società
      if (!codiceFiscale || !denominazione) return null;

      const cap = colonna(riga, "CAP", "cap");

      return {
        partitaIva: codiceFiscale,
        codiceFiscale,
        denominazione,
        indirizzo: {
          via: colonna(riga, "Indirizzo", "indirizzo"),
          civico: null,
          cap: cap && /^\d{1,5}$/.test(cap) ? cap.padStart(5, "0") : cap,
          comune: colonna(riga, "Comune", "comune", "descrizionecomune"),
          provincia: colonna(riga, "Provincia", "provincia", "siglaprovincia"),
          regione: colonna(riga, "Regione", "regione"),
        },
        fonte: "ipa-csv",
        dataAcquisizione,
      };
    })
    .filter((riga) => riga !== null);
}

/**
 * ANAC — aggiudicatari di appalti pubblici.
 * Il codice fiscale dell'aggiudicatario coincide con la partita IVA per le
 * società; le persone fisiche hanno un CF a 16 caratteri e vengono scartate
 * più avanti dalla validazione.
 */
export function parseAnacCsv(
  contenuto: Buffer,
  dataAcquisizione: string,
): unknown[] {
  const { righe } = leggiCsv(contenuto);

  return righe
    .map((riga) => {
      const codiceFiscale = colonna(
        riga,
        "codice_fiscale",
        "cf_aggiudicatario",
        "codicefiscaleaggiudicatario",
        "codicefiscale",
      );
      const denominazione = colonna(
        riga,
        "denominazione",
        "ragione_sociale",
        "denominazione_aggiudicatario",
        "aggiudicatario",
      );

      if (!codiceFiscale || !denominazione) return null;

      return {
        partitaIva: codiceFiscale,
        codiceFiscale,
        denominazione,
        fonte: "anac-csv",
        dataAcquisizione,
      };
    })
    .filter((riga) => riga !== null);
}

/**
 * RNA — Registro nazionale degli aiuti di Stato, esportazione XML.
 *
 * I file sono grossi e annidati; qui si estrae solo ciò che serve
 * all'indice — codice fiscale e denominazione del beneficiario — con una
 * lettura a scorrimento invece di costruire un albero in memoria.
 */
export function parseRnaXml(
  contenuto: Buffer,
  dataAcquisizione: string,
): unknown[] {
  const testo = contenuto.toString("utf8");
  const imprese = new Map<string, Record<string, unknown>>();

  const estrai = (blocco: string, ...tag: string[]): string | null => {
    for (const nome of tag) {
      const trovato = new RegExp(
        `<(?:\\w+:)?${nome}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nome}>`,
        "i",
      ).exec(blocco);
      if (trovato) {
        const valore = trovato[1]!
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim();
        if (valore) return valore;
      }
    }
    return null;
  };

  // ogni beneficiario è un blocco a sé: si scorre senza costruire l'albero
  const blocchi = testo.matchAll(
    /<(?:\w+:)?(?:BENEFICIARIO|Beneficiario|beneficiario)[^>]*>([\s\S]*?)<\/(?:\w+:)?(?:BENEFICIARIO|Beneficiario|beneficiario)>/g,
  );

  for (const blocco of blocchi) {
    const corpo = blocco[1]!;
    const codiceFiscale = estrai(corpo, "CODICE_FISCALE", "CodiceFiscale", "CF");
    const denominazione = estrai(
      corpo,
      "DENOMINAZIONE_BENEFICIARIO",
      "DenominazioneBeneficiario",
      "DENOMINAZIONE",
      "Denominazione",
    );

    if (!codiceFiscale || !denominazione || imprese.has(codiceFiscale)) continue;

    imprese.set(codiceFiscale, {
      partitaIva: codiceFiscale,
      codiceFiscale,
      denominazione,
      fonte: "rna-xml",
      dataAcquisizione,
    });
  }

  return [...imprese.values()];
}
