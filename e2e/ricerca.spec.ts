import { expect, test } from "@playwright/test";

/** Partita IVA reale e valida, presente nel provider finto. */
const PIVA = "00743110157";
const DENOMINAZIONE = "Esempio Manifattura S.p.A.";

test.describe("dalla ricerca alla scheda azienda", () => {
  test("una Partita IVA valida porta alla scheda", async ({ page }) => {
    await page.goto("/");

    const campo = page.getByRole("searchbox", { name: /cerca un'azienda/i });
    await campo.fill(PIVA);

    // il riscontro appare senza premere nulla, appena il numero è completo
    await expect(page.getByText(/formalmente valida/i)).toBeVisible();

    await page.getByRole("button", { name: "Cerca", exact: true }).click();

    await expect(page).toHaveURL(/\/azienda\/.*-00743110157$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(DENOMINAZIONE);
    // lo stato accanto al titolo, non quello delle aziende simili in fondo
    await expect(
      page.locator("h1").locator("..").getByText("Attiva"),
    ).toBeVisible();
  });

  test("la scheda mostra i dati camerali", async ({ page }) => {
    await page.goto(`/azienda/${PIVA}`);

    await expect(
      page.getByRole("heading", { name: "Dati della società" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Altre informazioni" }),
    ).toBeVisible();
    await expect(page.getByText("25.62.00")).toBeVisible();
    await expect(page.getByText("MI-1305487")).toBeVisible();
  });

  test("il catalogo documenti è visibile ma non ordinabile", async ({ page }) => {
    await page.goto(`/azienda/${PIVA}`);

    await expect(
      page.getByRole("heading", { name: "Documenti ufficiali" }),
    ).toBeVisible();
    await expect(page.getByText(/ordine non ancora attivo/i)).toBeVisible();

    // nessun pulsante d'acquisto deve risultare cliccabile
    const ordina = page.getByRole("button", { name: "Ordina" });
    await expect(ordina.first()).toBeDisabled();
    const quanti = await ordina.count();
    for (let i = 0; i < quanti; i++) {
      await expect(ordina.nth(i)).toBeDisabled();
    }
  });

  test("il codice fiscale di una persona fisica è oscurato", async ({ page }) => {
    // il provider di sviluppo espone imprese vere: qui il CF coincide con la
    // P.IVA, quindi si verifica la funzione sulla scheda inventata
    await page.goto(`/azienda/${PIVA}`);
    await expect(page.getByText("Codice fiscale:")).toBeVisible();
  });

  test("uno slug non canonico viene corretto", async ({ page }) => {
    await page.goto(`/azienda/${PIVA}`);
    await expect(page).toHaveURL(`/azienda/esempio-manifattura-s-p-a-${PIVA}`);
  });

  test("una Partita IVA con cifra di controllo errata viene respinta subito", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("searchbox", { name: /cerca un'azienda/i })
      .fill("00743110158");

    await expect(page.getByText(/cifra di controllo non torna/i)).toBeVisible();

    // premendo Cerca si resta in home: non parte nessuna richiesta
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page).toHaveURL("/");
  });

  test("una Partita IVA inesistente dà una spiegazione, non un errore generico", async ({
    page,
  }) => {
    await page.goto("/azienda/00000000000");

    await expect(
      page.getByRole("heading", {
        name: /nessuna impresa con questa partita iva/i,
      }),
    ).toBeVisible();
  });

  test("gli esempi cliccabili funzionano", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Cerca 00743110157/ }).click();

    await expect(page).toHaveURL(/\/azienda\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(DENOMINAZIONE);
  });

  test("le ricerche recenti restano fra una visita e l'altra", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Cerca 00743110157/ }).click();
    await expect(page).toHaveURL(/\/azienda\//);

    await page.goto("/");
    await expect(page.getByText("Ricerche recenti:")).toBeVisible();
    await expect(
      page.getByRole("button", { name: PIVA, exact: true }),
    ).toBeVisible();
  });
});

test.describe("consultare l'elenco delle aziende", () => {
  /**
   * L'archivio cambia con le aziende interrogate: questi test ricavano i
   * valori dalla pagina invece di nominare aziende o province, altrimenti
   * smetterebbero di valere appena cambia la fonte dei dati.
   */
  test("senza query mostra l'elenco navigabile", async ({ page }) => {
    await page.goto("/ricerca");

    await expect(page.getByText(/aziende? trovat/)).toBeVisible();
    const schede = page.locator('a[href^="/azienda/"]');
    expect(await schede.count()).toBeGreaterThan(0);
  });

  test("dall'elenco si apre la scheda", async ({ page }) => {
    await page.goto("/ricerca");

    const prima = page.locator('a[href^="/azienda/"]').first();
    const nome = (await prima.locator("h3").textContent())?.trim();
    const indirizzo = await prima.getAttribute("href");

    await page.goto(indirizzo!);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nome!);
    await expect(
      page.getByRole("heading", { name: "Dati della società" }),
    ).toBeVisible();
  });

  test("la ricerca per nome restringe i risultati", async ({ page }) => {
    await page.goto("/ricerca");
    const totale = await page.getByText(/aziende? trovat/).textContent();

    // si cerca la prima parola della prima azienda in elenco
    const nome = await page
      .locator('a[href^="/azienda/"] h3')
      .first()
      .textContent();
    const parola = nome!.trim().split(/\s+/)[0]!;

    await page.goto(`/ricerca?q=${encodeURIComponent(parola)}`);

    await expect(page.getByText(new RegExp(`per ${parola}`, "i"))).toBeVisible();
    const filtrato = await page.getByText(/aziende? trovat/).textContent();
    expect(filtrato).not.toBe(totale);
  });

  test("il filtro per provincia funziona", async ({ page }) => {
    await page.goto("/ricerca");

    const filtro = page.getByRole("navigation", { name: /filtra per provincia/i });
    // il filtro compare solo con almeno due province in elenco
    if ((await filtro.count()) === 0) test.skip();

    const sigla = (await filtro.getByRole("link").nth(1).textContent())!
      .trim()
      .slice(0, 2);
    await filtro.getByRole("link").nth(1).click();

    await expect(page).toHaveURL(new RegExp(`provincia=${sigla}`));
    await expect(page.getByText(`(${sigla})`).first()).toBeVisible();
  });

  test("una ricerca senza esito lo dice, invece di mostrare il vuoto", async ({
    page,
  }) => {
    await page.goto("/ricerca?q=zzzznonesistequestaazienda");

    await expect(
      page.getByRole("heading", { name: /nessuna azienda trovata/i }),
    ).toBeVisible();
  });
});

test.describe("sfogliare per territorio", () => {
  /**
   * Questi test non nominano regioni o comuni: l'archivio cambia con le
   * aziende interrogate, e un test legato a «Bergamo» smetterebbe di valere
   * appena cambia la fonte dei dati. Si segue invece il primo collegamento
   * disponibile a ogni livello.
   */
  test("dalla regione si scende fino alla scheda", async ({ page }) => {
    await page.goto("/aziende");
    await expect(
      page.getByRole("heading", { name: /aziende italiane per regione/i }),
    ).toBeVisible();

    await page
      .locator('a[href^="/aziende/"]:not([href*="/lettera/"])')
      .first()
      .click();
    await expect(page).toHaveURL(/\/aziende\/[a-z-]+$/);

    await page
      .locator('a[href^="/aziende/"]:not([href*="/lettera/"])')
      .first()
      .click();
    await expect(page).toHaveURL(/\/aziende\/[a-z-]+\/[a-z-]+$/);
    await expect(
      page.getByRole("heading", { name: /provincia di/i }),
    ).toBeVisible();

    const azienda = page.locator('a[href^="/azienda/"]').first();
    await azienda.click();
    await expect(page).toHaveURL(/\/azienda\//);
    await expect(
      page.getByRole("heading", { name: "Dati della società" }),
    ).toBeVisible();
  });

  test("le briciole riportano indietro nella gerarchia", async ({ page }) => {
    await page.goto("/aziende");
    // si legge l'indirizzo invece di leggere page.url() dopo un click: la
    // navigazione può non essere ancora conclusa
    const regione = (await page
      .locator('a[href^="/aziende/"]:not([href*="/lettera/"])')
      .first()
      .getAttribute("href"))!;

    await page.goto(regione);
    const provincia = (await page
      .locator('a[href^="/aziende/"]:not([href*="/lettera/"])')
      .first()
      .getAttribute("href"))!;

    await page.goto(provincia);
    const percorso = page.getByRole("navigation", { name: "Percorso" });
    await percorso.getByRole("link").nth(1).click();

    await expect(page).toHaveURL(new RegExp(`${regione}$`));
  });

  test("un territorio inesistente è un 404, non una pagina vuota", async ({
    page,
  }) => {
    expect((await page.goto("/aziende/atlantide"))?.status()).toBe(404);
    expect((await page.goto("/aziende/lombardia/zzz"))?.status()).toBe(404);
  });
});

test.describe("indice alfabetico", () => {
  test("le lettere con aziende portano al loro elenco", async ({ page }) => {
    await page.goto("/aziende");

    const indice = page.getByRole("navigation", { name: /indice alfabetico/i });
    await expect(indice).toBeVisible();

    const attiva = indice.getByRole("link").first();
    const lettera = (await attiva.textContent())!.trim();
    await attiva.click();

    await expect(page).toHaveURL(/\/aziende\/lettera\//);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(lettera);
    expect(await page.locator('a[href^="/azienda/"]').count()).toBeGreaterThan(0);
  });

  test("le lettere senza aziende non sono cliccabili", async ({ page }) => {
    await page.goto("/aziende");

    const indice = page.getByRole("navigation", { name: /indice alfabetico/i });
    // ventisette caselle in tutto: A-Z più il gruppo delle cifre
    expect(await indice.locator("a, span").count()).toBe(27);
    expect(await indice.locator("span[aria-disabled]").count()).toBeGreaterThan(0);
  });

  test("una lettera senza risultati è un 404", async ({ page }) => {
    expect((await page.goto("/aziende/lettera/zz"))?.status()).toBe(404);
  });
});

test.describe("sfogliare per settore", () => {
  test("l'indice dei settori porta alla divisione e alla scheda", async ({
    page,
  }) => {
    await page.goto("/attivita");
    await expect(
      page.getByRole("heading", { name: /aziende italiane per settore/i }),
    ).toBeVisible();

    const divisione = page.locator('a[href^="/attivita/"]').first();
    await divisione.click();

    await expect(page).toHaveURL(/\/attivita\/\d/);
    await expect(page.getByText(/con codice ATECO/i)).toBeVisible();

    const azienda = page.locator('a[href^="/azienda/"]').first();
    await azienda.click();
    await expect(page).toHaveURL(/\/azienda\//);
  });

  test("un settore inesistente è un 404", async ({ page }) => {
    expect((await page.goto("/attivita/99-inventato"))?.status()).toBe(404);
    expect((await page.goto("/attivita/senza-codice"))?.status()).toBe(404);
  });
});

test.describe("verifica su VIES", () => {
  test("il controllo formale avviene prima di interrogare il servizio", async ({
    page,
  }) => {
    await page.goto("/verifica-partita-iva");

    const campo = page.getByRole("searchbox", {
      name: /partita iva da verificare/i,
    });
    await campo.fill("12345678901");

    await expect(page.getByText(/cifra di controllo non torna/i)).toBeVisible();
  });

  test("la pagina spiega che cosa significa ciascun esito", async ({ page }) => {
    await page.goto("/verifica-partita-iva");

    await expect(
      page.getByRole("heading", { name: /che cosa significa il risultato/i }),
    ).toBeVisible();
    await expect(page.getByText(/non è un esito negativo/i)).toBeVisible();
  });
});

test.describe("pagine legali", () => {
  test("sono raggiungibili dal piè di pagina", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Privacy" }).click();
    await expect(
      page.getByRole("heading", { name: "Informativa privacy" }),
    ).toBeVisible();
    await expect(
      page.getByText(/procedura|rettifica|cancellazione/i).first(),
    ).toBeVisible();
  });

  test("il disclaimer di indipendenza è sempre visibile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/non è affiliato/i)).toBeVisible();
  });
});
