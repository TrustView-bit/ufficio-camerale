import { describe, expect, it } from "vitest";

import {
  analizzaIndirizzoItaliano,
  chiaveComune,
  normalizzaComune,
  provinciaToSigla,
  riconosciComuneInCoda,
  siglaToProvincia,
  titoloProprio,
} from "./geo";

describe("chiaveComune", () => {
  it("appiattisce accenti, apostrofi e maiuscole", () => {
    expect(chiaveComune("Sant'Ambrogio di Torino")).toBe(
      chiaveComune("SANT AMBROGIO DI TORINO"),
    );
    expect(chiaveComune("Forlì")).toBe(chiaveComune("FORLI"));
    expect(chiaveComune("Reggio nell'Emilia")).toBe(
      chiaveComune("REGGIO NELL EMILIA"),
    );
  });
});

describe("normalizzaComune", () => {
  it("riconosce un comune scritto tutto in maiuscolo, come da VIES", () => {
    const comune = normalizzaComune("MILANO");

    expect(comune).toMatchObject({
      comune: "Milano",
      sigla: "MI",
      provincia: "Milano",
      regione: "Lombardia",
    });
    expect(comune?.codiceIstat).toMatch(/^\d{6}$/);
  });

  it("tollera accenti mancanti e apostrofi diversi", () => {
    expect(normalizzaComune("FORLI")?.comune).toBe("Forlì");
    expect(normalizzaComune("SANT ANGELO LODIGIANO")?.comune).toBe(
      "Sant'Angelo Lodigiano",
    );
  });

  it("riconosce la forma bilingue con la barra", () => {
    expect(normalizzaComune("Bolzano/Bozen")?.sigla).toBe("BZ");
  });

  it("riconosce un comune altoatesino dal nome italiano", () => {
    expect(normalizzaComune("BRESSANONE")).toMatchObject({
      comune: "Bressanone",
      sigla: "BZ",
    });
  });

  it("senza provincia non sceglie a caso fra comuni omonimi", () => {
    // Samone esiste sia in provincia di Torino sia in Trentino
    expect(normalizzaComune("Samone")).toBeNull();
  });

  it("disambigua con la sigla della provincia", () => {
    expect(normalizzaComune("Samone", "TO")?.sigla).toBe("TO");
    expect(normalizzaComune("Samone", "TN")?.sigla).toBe("TN");
  });

  it("disambigua anche con il nome esteso della provincia", () => {
    expect(normalizzaComune("Castro", "Bergamo")?.sigla).toBe("BG");
    expect(normalizzaComune("Castro", "Lecce")?.sigla).toBe("LE");
  });

  it("restituisce null per ciò che non è un comune italiano", () => {
    expect(normalizzaComune("Parigi")).toBeNull();
    expect(normalizzaComune("")).toBeNull();
    expect(normalizzaComune("   ")).toBeNull();
  });

  it("una provincia sbagliata non fa passare il comune omonimo", () => {
    expect(normalizzaComune("Samone", "MI")).toBeNull();
  });
});

describe("siglaToProvincia e provinciaToSigla", () => {
  it("traducono nei due sensi", () => {
    expect(siglaToProvincia("MI")).toBe("Milano");
    expect(siglaToProvincia("mi")).toBe("Milano");
    expect(provinciaToSigla("Milano")).toBe("MI");
  });

  it("gestiscono le province con nome bilingue", () => {
    expect(siglaToProvincia("BZ")).toBe("Bolzano/Bozen");
    expect(provinciaToSigla("Bolzano")).toBe("BZ");
    expect(provinciaToSigla("Bozen")).toBe("BZ");
  });

  it("restituiscono null su sigle inesistenti", () => {
    expect(siglaToProvincia("XX")).toBeNull();
    expect(provinciaToSigla("Neverland")).toBeNull();
  });
});

describe("titoloProprio", () => {
  it("smaiuscola gli indirizzi delle fonti ufficiali", () => {
    expect(titoloProprio("LARGO FRANCESCO RICHINI 6")).toBe(
      "Largo Francesco Richini 6",
    );
  });

  it("tiene minuscole le preposizioni interne", () => {
    expect(titoloProprio("VIA DEI MILLE 12")).toBe("Via dei Mille 12");
    expect(titoloProprio("PIAZZA DELLA REPUBBLICA")).toBe(
      "Piazza della Repubblica",
    );
  });

  it("mette la maiuscola anche dopo un apostrofo", () => {
    expect(titoloProprio("VIA SANT'AMBROGIO")).toBe("Via Sant'Ambrogio");
  });

  it("non tocca ciò che contiene cifre", () => {
    expect(titoloProprio("VIA XX SETTEMBRE 1/A")).toBe("Via XX Settembre 1/A");
  });
});

describe("analizzaIndirizzoItaliano", () => {
  it("interpreta un indirizzo VIES reale", () => {
    // esattamente come lo restituisce la Commissione europea
    const indirizzo = analizzaIndirizzoItaliano(
      "LARGO FRANCESCO RICHINI 6 \n20122 MILANO MI\n",
    );

    expect(indirizzo).toEqual({
      via: "Largo Francesco Richini 6",
      cap: "20122",
      comune: "Milano",
      provincia: "MI",
      nazione: "IT",
      comuneRiconosciuto: true,
    });
  });

  it("riconosce il comune anche senza la sigla della provincia", () => {
    expect(analizzaIndirizzoItaliano("VIA ROMA 1\n50100 FIRENZE")).toMatchObject({
      comune: "Firenze",
      provincia: "FI",
    });
  });

  it("conserva il testo quando il comune non risulta nel dataset", () => {
    const indirizzo = analizzaIndirizzoItaliano("RUE DE LA PAIX 3\n75002 PARIGI");

    expect(indirizzo?.comuneRiconosciuto).toBe(false);
    expect(indirizzo?.comune).toBe("Parigi");
  });

  it("gestisce una via su più righe", () => {
    expect(
      analizzaIndirizzoItaliano("VIA ROMA 1\nSCALA B\n20100 MILANO MI"),
    ).toMatchObject({ via: "Via Roma 1, Scala B" });
  });

  it("non inventa nulla su un indirizzo vuoto", () => {
    expect(analizzaIndirizzoItaliano("")).toBeNull();
    expect(analizzaIndirizzoItaliano("   \n  ")).toBeNull();
  });
});

describe("titoloProprio — cifre romane", () => {
  it("conserva le cifre romane dei nomi di via", () => {
    expect(titoloProprio("VIA IV NOVEMBRE")).toBe("Via IV Novembre");
    expect(titoloProprio("VIALE XXV APRILE")).toBe("Viale XXV Aprile");
  });

  it("non scambia le preposizioni per cifre romane", () => {
    expect(titoloProprio("VIA DI VILLA CHIGI")).toBe("Via di Villa Chigi");
    expect(titoloProprio("VIA DEL CORSO")).toBe("Via del Corso");
  });
});

describe("riconosciComuneInCoda", () => {
  it("separa via e comune quando c'è il trattino", () => {
    const esito = riconosciComuneInCoda(
      "VIA NAZIONALE SANNITICA, 5 - CASTELVENERE",
    );

    expect(esito?.via).toBe("Via Nazionale Sannitica, 5");
    expect(esito?.comune.comune).toBe("Castelvenere");
    expect(esito?.comune.sigla).toBe("BN");
  });

  it("riconosce il comune anche senza separatore", () => {
    const esito = riconosciComuneInCoda("VIA SANNITA, 16 AIROLA");

    expect(esito?.via).toBe("Via Sannita, 16");
    expect(esito?.comune.comune).toBe("Airola");
  });

  it("preferisce il nome di comune più lungo", () => {
    const esito = riconosciComuneInCoda("VIA ROMA 1 SAN GIORGIO DEL SANNIO");

    expect(esito?.comune.comune).toBe("San Giorgio del Sannio");
    expect(esito?.via).toBe("Via Roma 1");
  });

  it("ignora la sigla di provincia fra parentesi", () => {
    expect(
      riconosciComuneInCoda("PIAZZA UMBERTO I 34 BENEVENTO (BN)")?.comune.comune,
    ).toBe("Benevento");
  });

  it("restituisce null se in coda non c'è un comune", () => {
    expect(riconosciComuneInCoda("VIA AC")).toBeNull();
    expect(riconosciComuneInCoda("")).toBeNull();
  });

  it("regge un indirizzo fatto del solo comune", () => {
    const esito = riconosciComuneInCoda("BENEVENTO");

    expect(esito?.comune.comune).toBe("Benevento");
    expect(esito?.via).toBeNull();
  });
});
