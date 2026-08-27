import { describe, expect, it } from "vitest";

import { validaRiga } from "../schema";

import { parseAnacCsv, parseIpaCsv, parseRnaXml } from "./aperti";
import {
  dataDa,
  parseTelemacoEsteso,
  parseTelemacoIndirizzi,
  TracciatoSconosciuto,
} from "./telemaco";

const OGGI = "2026-08-27T00:00:00.000Z";

/** Un CSV Telemaco come arriva davvero: latin-1, punto e virgola, campi sporchi. */
const TELEMACO_INDIRIZZI = Buffer.from(
  [
    "DENOMINAZIONE;PARTITA IVA;CODICE FISCALE;INDIRIZZO;CIVICO;CAP;COMUNE;PROVINCIA",
    "SOCIET\xC0 ESEMPIO S.R.L.;IT00743110157;00743110157;VIA ROMA;12;4020;SPIGNO SATURNIA;LT",
    '"ROSSI ""MARIO"" & FIGLI S.N.C.";00488410010;00488410010;VIA PI\xD9 CORTA;1/A;20121;MILANO;MI',
    "IMPRESA SENZA PIVA;;;VIA VUOTA;;;;",
    "PIVA SBAGLIATA S.R.L.;00743110158;;VIA FINTA;3;20121;MILANO;MI",
  ].join("\n"),
  "latin1",
);

describe("parseTelemacoIndirizzi", () => {
  const righe = parseTelemacoIndirizzi(TELEMACO_INDIRIZZI, OGGI);

  it("scarta le righe senza partita IVA già in lettura", () => {
    // la riga "IMPRESA SENZA PIVA" non arriva nemmeno alla validazione
    expect(righe).toHaveLength(3);
  });

  it("toglie il prefisso IT e ripristina lo zero del CAP", () => {
    const prima = validaRiga(righe[0]);
    expect(prima.ok).toBe(true);
    if (!prima.ok) return;

    expect(prima.impresa.partitaIva).toBe("00743110157");
    expect(prima.impresa.indirizzo?.cap).toBe("04020");
  });

  it("legge gli accenti latin-1 senza storpiarli", () => {
    const prima = validaRiga(righe[0]);
    expect(prima.ok && prima.impresa.denominazione).toBe("SOCIETÀ ESEMPIO S.R.L.");
  });

  it("regge virgolette e punto e virgola dentro la denominazione", () => {
    const seconda = validaRiga(righe[1]);
    expect(seconda.ok && seconda.impresa.denominazione).toBe(
      'ROSSI "MARIO" & FIGLI S.N.C.',
    );
  });

  it("la validazione scarta la partita IVA con cifra di controllo errata", () => {
    const terza = validaRiga(righe[2]);
    expect(terza.ok).toBe(false);
    if (terza.ok) return;
    expect(terza.motivo).toContain("cifra di controllo");
  });

  it("si ferma se il file non ha le colonne attese", () => {
    const estraneo = Buffer.from("colonna_a;colonna_b\n1;2\n", "utf8");
    expect(() => parseTelemacoIndirizzi(estraneo, OGGI)).toThrow(
      TracciatoSconosciuto,
    );
  });
});

describe("parseTelemacoEsteso", () => {
  const contenuto = Buffer.from(
    [
      "RAGIONE SOCIALE;PARTITA IVA;FORMA GIURIDICA;STATO ATTIVITA;ATECO;DESCRIZIONE ATECO;REA;CCIAA;CAPITALE SOCIALE;DIPENDENTI;DATA COSTITUZIONE;COMUNE;PROVINCIA",
      "ESEMPIO MANIFATTURA S.P.A.;00743110157;SOCIETA' PER AZIONI;ATTIVA;62.01.00;Programmazione;1305487;MI;2.500.000,00;92;17/04/1962;MILANO;MI",
      "ESEMPIO CESSATA S.R.L.;00488410010;S.R.L.;CESSATA;;;;;;;;TORINO;TO",
    ].join("\n"),
    "utf8",
  );

  const righe = parseTelemacoEsteso(contenuto, OGGI);

  it("legge capitale, dipendenti e data all'italiana", () => {
    const prima = validaRiga(righe[0]);
    expect(prima.ok).toBe(true);
    if (!prima.ok) return;

    expect(prima.impresa.capitaleSociale).toBe(2500000);
    expect(prima.impresa.dipendenti).toBe(92);
    expect(prima.impresa.dataCostituzione).toBe("1962-04-17");
  });

  it("compone il REA con la camera di commercio", () => {
    const prima = validaRiga(righe[0]);
    expect(prima.ok && prima.impresa.rea).toBe("MI-1305487");
  });

  it("marca l'ATECO come classificazione 2022, che è quella negli elenchi", () => {
    const prima = validaRiga(righe[0]);
    expect(prima.ok && prima.impresa.ateco?.versione).toBe("2022");
  });

  it("riconosce lo stato attività", () => {
    expect(
      validaRiga(righe[0]).ok &&
        (validaRiga(righe[0]) as { impresa: { statoAttivita: string } }).impresa
          .statoAttivita,
    ).toBe("attiva");
    const seconda = validaRiga(righe[1]);
    expect(seconda.ok && seconda.impresa.statoAttivita).toBe("cessata");
  });

  it("non inventa i campi che nel file sono vuoti", () => {
    const seconda = validaRiga(righe[1]);
    expect(seconda.ok).toBe(true);
    if (!seconda.ok) return;

    expect(seconda.impresa.capitaleSociale).toBeNull();
    expect(seconda.impresa.ateco).toBeNull();
    expect(seconda.impresa.rea).toBeNull();
  });
});

describe("dataDa", () => {
  it("riconosce i formati che girano negli elenchi", () => {
    expect(dataDa("17/04/1962")).toBe("1962-04-17");
    expect(dataDa("19620417")).toBe("1962-04-17");
    expect(dataDa("1962-04-17")).toBe("1962-04-17");
    expect(dataDa("1962")).toBe("1962");
  });

  it("non indovina su ciò che non riconosce", () => {
    expect(dataDa("primavera 1962")).toBeNull();
    expect(dataDa(null)).toBeNull();
  });
});

describe("fonti aperte", () => {
  it("IPA: legge enti con CF, denominazione e indirizzo", () => {
    const contenuto = Buffer.from(
      [
        "Codice_fiscale_ente,Denominazione_ente,Indirizzo,CAP,Comune,Provincia",
        "00743110157,Comune di Esempio,Piazza Maggiore 1,4020,Spigno Saturnia,LT",
      ].join("\n"),
      "utf8",
    );

    const righe = parseIpaCsv(contenuto, OGGI);
    const prima = validaRiga(righe[0]);

    expect(prima.ok).toBe(true);
    if (!prima.ok) return;
    expect(prima.impresa.denominazione).toBe("Comune di Esempio");
    expect(prima.impresa.indirizzo?.cap).toBe("04020");
    expect(prima.impresa.fonte).toBe("ipa-csv");
  });

  it("ANAC: legge gli aggiudicatari", () => {
    const contenuto = Buffer.from(
      "codice_fiscale;denominazione\n00743110157;Esempio Costruzioni S.r.l.\n",
      "utf8",
    );

    const righe = parseAnacCsv(contenuto, OGGI);
    expect(righe).toHaveLength(1);
    expect(validaRiga(righe[0]).ok).toBe(true);
  });

  it("RNA: estrae i beneficiari dall'XML e li deduplica", () => {
    const xml = Buffer.from(
      `<?xml version="1.0"?><AIUTI>
        <BENEFICIARIO><CODICE_FISCALE>00743110157</CODICE_FISCALE>
          <DENOMINAZIONE_BENEFICIARIO><![CDATA[Esempio & Figli S.r.l.]]></DENOMINAZIONE_BENEFICIARIO>
        </BENEFICIARIO>
        <BENEFICIARIO><CODICE_FISCALE>00743110157</CODICE_FISCALE>
          <DENOMINAZIONE_BENEFICIARIO>Esempio &amp; Figli S.r.l.</DENOMINAZIONE_BENEFICIARIO>
        </BENEFICIARIO>
        <BENEFICIARIO><CODICE_FISCALE>00488410010</CODICE_FISCALE>
          <DENOMINAZIONE_BENEFICIARIO>Altra S.p.A.</DENOMINAZIONE_BENEFICIARIO>
        </BENEFICIARIO>
      </AIUTI>`,
      "utf8",
    );

    const righe = parseRnaXml(xml, OGGI);

    // lo stesso beneficiario compare due volte: una sola deve uscirne
    expect(righe).toHaveLength(2);
    const prima = validaRiga(righe[0]);
    expect(prima.ok && prima.impresa.denominazione).toBe("Esempio & Figli S.r.l.");
  });
});
