import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Verifica automatica di accessibilità sulle pagine principali.
 *
 * axe non certifica la conformità — molti criteri WCAG richiedono un giudizio
 * umano — ma coglie in modo affidabile la classe di errori che si introduce
 * senza accorgersene: contrasti insufficienti, campi senza etichetta,
 * gerarchie di titoli saltate, ruoli incoerenti.
 */

const PAGINE = [
  { nome: "home", url: "/" },
  { nome: "verifica P.IVA", url: "/verifica-partita-iva" },
  { nome: "ricerca", url: "/ricerca?q=eni" },
  { nome: "scheda azienda", url: "/azienda/00743110157" },
  { nome: "indice per territorio", url: "/aziende" },
  { nome: "indice per settore", url: "/attivita" },
  { nome: "privacy", url: "/privacy" },
];

for (const pagina of PAGINE) {
  test(`${pagina.nome} non ha violazioni WCAG 2.1 A/AA`, async ({ page }) => {
    await page.goto(pagina.url);

    const esito = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      esito.violations.map((violazione) => ({
        regola: violazione.id,
        impatto: violazione.impact,
        dove: violazione.nodes.map((nodo) => nodo.target).slice(0, 3),
      })),
    ).toEqual([]);
  });
}

/**
 * Il tema scuro ridefinisce tutti i token di colore: i contrasti vanno
 * verificati una seconda volta, o si scopre che il tema chiaro è a norma e
 * l'altro no.
 */
test.describe("tema scuro", () => {
  test.use({ colorScheme: "dark" });

  for (const pagina of [PAGINE[0]!, PAGINE[3]!]) {
    test(`${pagina.nome} al buio`, async ({ page }) => {
      await page.goto(pagina.url);

      const esito = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(
        esito.violations.map((violazione) => ({
          regola: violazione.id,
          dove: violazione.nodes.map((nodo) => nodo.target).slice(0, 3),
        })),
      ).toEqual([]);
    });
  }
});

test.describe("navigazione da tastiera", () => {
  test("il primo Tab offre il salto al contenuto, e il salto funziona", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    const salto = page.getByRole("link", { name: "Vai al contenuto" });
    await expect(salto).toBeFocused();
    // deve anche essere visibile: un salto che resta invisibile non aiuta
    await expect(salto).toBeVisible();

    await salto.press("Enter");

    // dopo il salto la tabulazione riparte dal contenuto, non dalla testata
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("searchbox", { name: /cerca un'azienda/i }),
    ).toBeFocused();
  });

  test("il campo di ricerca si usa senza mouse", async ({ page }) => {
    await page.goto("/");

    const campo = page.getByRole("searchbox", { name: /cerca un'azienda/i });
    await campo.focus();
    await campo.pressSequentially("00743110157");
    await campo.press("Enter");

    await expect(page).toHaveURL(/\/azienda\/.*-00743110157$/);
  });
});
