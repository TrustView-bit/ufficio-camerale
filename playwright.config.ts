import { defineConfig, devices } from "@playwright/test";

const PORTA = 3100;
const BASE_URL = `http://127.0.0.1:${PORTA}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "it-IT",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // I test girano contro una build di produzione, non contro il dev server:
  // è il bersaglio più fedele, e `next dev` non ammette comunque due istanze
  // nella stessa cartella. La prima esecuzione è lenta perché compila.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORTA}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: "ignore",

    /**
     * I test girano SEMPRE sul provider dimostrativo, mai su quello reale.
     *
     * Due motivi, entrambi decisivi: ogni esecuzione della suite chiamerebbe
     * un'API a pagamento — decine di chiamate per volta — e i test
     * dipenderebbero da dati che cambiano, diventando fragili senza motivo.
     *
     * Le variabili passate qui vincono su quelle di .env.local. `DATABASE_URL`
     * vuota vale come assente, quindi non si tocca nemmeno l'archivio.
     */
    env: {
      COMPANY_PROVIDER: "mock",
      DATABASE_URL: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    },
  },
});
