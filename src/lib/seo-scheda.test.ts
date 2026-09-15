import { describe, expect, it } from "vitest";

import { formatEuro } from "@/lib/format";
import type { CompanyData } from "@/lib/providers/types";

import {
  descrizioneScheda,
  domandeFrequenti,
  frasiFatto,
  indiziAffidabilita,
  titoloScheda,
} from "./seo-scheda";

const ORA = new Date("2026-09-05T00:00:00Z");

const ENI: CompanyData = {
  partitaIva: "00905811006",
  codiceFiscale: "00484960588",
  denominazione: "ENI S.P.A.",
  formaGiuridica: "Società per azioni",
  statoAttivita: "attiva",
  dataCostituzione: "1992-08-07",
  reaNumero: "756453",
  reaCciaa: "RM",
  capitaleSociale: 4_005_358_876,
  atecoPrimario: "19.20.1",
  atecoVersione: "2025",
  atecoPrimarioDescrizione: "Raffinerie di petrolio",
  atecoSecondari: [],
  sede: {
    via: "Piazzale Enrico Mattei 1",
    cap: "00144",
    comune: "Roma",
    provincia: "RM",
    nazione: "IT",
  },
  coordinate: null,
  codiceSdi: null,
  unitaLocali: [],
  bilanci: [
    { anno: 2024, fatturato: 35_026_371_529, utile: null, dipendenti: 11_623 },
    { anno: 2023, fatturato: 42_700_000_000, utile: null, dipendenti: 11_500 },
  ],
  pec: "eni@pec.eni.com",
  sitoWeb: null,
  telefono: null,
  dipendenti: 11_623,
  classeDipendenti: null,
};

/** Un'impresa di cui si sa solo nome e sede: il caso più frequente. */
const MAGRA: CompanyData = {
  ...ENI,
  partitaIva: "01234567890",
  codiceFiscale: null,
  denominazione: "Rossi Mario",
  formaGiuridica: null,
  statoAttivita: "sconosciuto",
  dataCostituzione: null,
  reaNumero: null,
  reaCciaa: null,
  capitaleSociale: null,
  atecoPrimario: null,
  atecoPrimarioDescrizione: null,
  bilanci: [],
  pec: null,
  dipendenti: null,
};

describe("titolo e description", () => {
  it("mettono nome, Partita IVA e i dati più cercati che la scheda ha", () => {
    expect(titoloScheda(ENI)).toBe(
      "ENI S.P.A. – Partita IVA 00905811006, fatturato, PEC, sede a Roma",
    );
    expect(titoloScheda(ENI).length).toBeLessThanOrEqual(70);
    expect(descrizioneScheda(ENI)).toMatch(/^00905811006 è la Partita IVA di ENI S\.P\.A\./);
    expect(descrizioneScheda(ENI)).toMatch(/fatturato 2024/i);
    expect(descrizioneScheda(ENI).length).toBeLessThanOrEqual(160);
  });

  it("con un nome lungo tengono nome e Partita IVA e lasciano cadere il resto", () => {
    const lunga = { ...ENI, denominazione: "GESTORE DEI MERCATI ENERGETICI S.P.A." };
    expect(titoloScheda(lunga)).toMatch(
      /^GESTORE DEI MERCATI ENERGETICI S\.P\.A\. – Partita IVA 00905811006/,
    );
    expect(titoloScheda(lunga).length).toBeLessThanOrEqual(70);
    expect(descrizioneScheda(lunga).length).toBeLessThanOrEqual(160);
  });

  it("su una scheda magra non promettono dati che non ci sono", () => {
    expect(titoloScheda(MAGRA)).toBe("Rossi Mario – Partita IVA 01234567890, sede a Roma");
    expect(descrizioneScheda(MAGRA)).not.toMatch(/PEC|REA|fatturato/);
  });
});

describe("frasiFatto", () => {
  it("apre con «numero è la Partita IVA di nome» e prosegue un fatto per frase", () => {
    const frasi = frasiFatto(ENI, ORA);
    expect(frasi[0]).toBe(
      "00905811006 è la Partita IVA di ENI S.P.A. (codice fiscale 00484960588).",
    );
    expect(frasi[1]).toBe(
      "ENI S.P.A. è una società per azioni, ha sede legale in Piazzale Enrico Mattei 1, 00144 Roma (RM), risulta attiva.",
    );
    expect(frasi).toContain(
      "È iscritta al Registro Imprese di RM con numero REA RM-756453, dal 7 agosto 1992.",
    );
    expect(frasi).toContain("Il codice ATECO è 19.20.1 – Raffinerie di petrolio.");
    expect(frasi).toContain(
      `Nel 2024 ha dichiarato un fatturato di ${formatEuro(35_026_371_529)} con 11.623 dipendenti.`,
    );
    expect(frasi).toContain("La PEC è eni@pec.eni.com.");
  });

  it("con pochi dati scrive poche frasi, mai frasi vuote", () => {
    const frasi = frasiFatto(MAGRA, ORA);
    expect(frasi).toEqual([
      "01234567890 è la Partita IVA di Rossi Mario.",
      "Rossi Mario ha sede legale in Piazzale Enrico Mattei 1, 00144 Roma (RM).",
    ]);
  });
});

describe("domandeFrequenti", () => {
  it("una domanda per ogni dato cercato, risposta di una riga", () => {
    const domande = domandeFrequenti(ENI);
    expect(domande.map((d) => d.domanda)).toEqual([
      "Qual è la Partita IVA di ENI S.P.A.?",
      "Qual è il codice fiscale di ENI S.P.A.?",
      "Dove ha sede legale ENI S.P.A.?",
      "Qual è la PEC di ENI S.P.A.?",
      "Qual è il numero REA di ENI S.P.A.?",
      "Di cosa si occupa ENI S.P.A.?",
      "Quanto fattura ENI S.P.A.?",
      "ENI S.P.A. è ancora attiva?",
    ]);
    expect(domande[0]!.risposta).toBe(
      "La Partita IVA di ENI S.P.A. è 00905811006 (VAT europeo IT00905811006).",
    );
  });

  it("sulla scheda magra restano solo P.IVA e sede", () => {
    expect(domandeFrequenti(MAGRA)).toHaveLength(2);
  });
});

describe("indiziAffidabilita", () => {
  it("elenca fatti, con la variazione del fatturato calcolata dai bilanci", () => {
    const indizi = indiziAffidabilita(ENI, ORA);
    expect(indizi).toContain("Stato nel Registro Imprese: attiva.");
    expect(indizi).toContain("Attiva da 34 anni (costituita nel 1992).");
    expect(indizi.find((i) => i.startsWith("Fatturato 2024"))).toBe(
      `Fatturato 2024: ${formatEuro(35_026_371_529)}, in calo del 18,0% rispetto al 2023. Bilanci depositati: 2.`,
    );
    expect(indizi.join(" ")).not.toMatch(/affidabile|solida|leader/i);
  });

  it("con meno di due fatti non si scrive niente", () => {
    expect(indiziAffidabilita(MAGRA, ORA)).toEqual([]);
  });
});
