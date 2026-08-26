# Ufficio Camerale

Portale italiano di verifica Partita IVA e consultazione dati camerali.
Ricerca una P.IVA, un codice fiscale o una ragione sociale e ottieni una scheda
azienda chiara e veloce.

> **Servizio indipendente.** Non affiliato a Camere di Commercio, InfoCamere o
> Unioncamere. I dati provengono da fonti pubbliche.

## Stato del progetto

| Step | Contenuto | Stato |
|---|---|---|
| 1 | Scaffold, design token, layout | ✅ fatto |
| 2 | Validazione P.IVA / CF + UI ricerca | ✅ fatto |
| 3 | Provider VIES + `/verifica-partita-iva` | ✅ fatto |
| 4 | Schema DB, cache, provider camerale | ✅ dati mock; provider reale da collegare |
| 5 | Scheda azienda + SEO | ⬜ |
| 6 | Descrizioni AI asincrone | ⬜ |
| 7 | Rate limiting, pagine legali, test, deploy | ⬜ |

## Stack

- **Next.js 16** (App Router) + **TypeScript strict**
- **Tailwind CSS v4** + **shadcn/ui** (preset radix-nova) + **lucide-react**
- **next-themes** per il dark mode
- **zod** per validare ogni input e ogni risposta esterna
- In arrivo: Drizzle + Neon Postgres, Upstash Redis, `@anthropic-ai/sdk`

## Requisiti

Node.js 22 (vedi `.nvmrc`). Con nvm:

```bash
nvm use
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Il sito è su http://localhost:3000, l'health check su `/api/health`.

## Comandi

```bash
npm run dev        # server di sviluppo
npm run build      # build di produzione
npm run start      # avvia la build
npm run lint       # ESLint
npm run typecheck  # TypeScript senza emettere output
npm run test       # unit test (vitest)
npm run format     # Prettier su tutto il progetto

npm run db:generate  # genera una migrazione dallo schema Drizzle
npm run db:migrate   # applica le migrazioni (richiede DATABASE_URL)
npm run db:studio    # esplora il database
```

> `npm run build` e `npm run dev` si contendono la cartella `.next`: ferma il
> server di sviluppo prima di lanciare una build di produzione.

## Design token

Tutti i colori, i raggi e le ombre sono definiti **una sola volta** in
[`src/app/globals.css`](src/app/globals.css), sia per il tema chiaro (`:root`)
che per quello scuro (`.dark`). I componenti non devono mai contenere valori
cromatici hardcodati: usa le utility Tailwind generate dai token
(`bg-primary`, `text-accent`, `bg-success-subtle`, …).

Convenzioni:

- `--primary` — blu profondo istituzionale, azioni principali
- `--accent` — teal/salvia, semantica di "verificato"
- `--success` / `--warning` / `--danger` — **solo** stati reali (attiva, in
  liquidazione, cessata, errori). Mai decorativi.
- `.num` — attiva i numeri tabulari per P.IVA, REA, capitale sociale

## Validazione

`src/lib/validation/` contiene i controlli formali, condivisi da client e
server e privi di dipendenze di rete:

- `partita-iva.ts` — normalizzazione (spazi, punteggiatura, prefisso `IT`) e
  cifra di controllo secondo l'algoritmo di Luhn.
- `codice-fiscale.ts` — carattere di controllo del CF di persona fisica,
  gestione dell'omocodia, e CF di persona giuridica (11 cifre come la P.IVA).
- `query.ts` — riconosce da solo se l'utente ha digitato una P.IVA, un codice
  fiscale o una ragione sociale, e raccoglie i testi corrispondenti in
  `QUERY_KIND_TEXT` (in italiano l'accordo cambia con il genere: *Partita IVA
  valida* ma *codice fiscale valido*).

La stessa analisi viene rieseguita lato server sulla pagina `/ricerca`: il
parametro `q` arriva dall'URL e non ci si può fidare del client.

## VIES

`src/lib/providers/vies.ts` interroga il servizio VIES della Commissione
europea, che conferma se una Partita IVA è valida per gli scambi
intracomunitari. È gratuito e non richiede chiavi, ma è lento e spesso
indisponibile: interroga in tempo reale l'anagrafe tributaria dello Stato
membro, che può non rispondere.

Per questo `checkVies()` **non lancia mai**. Qualunque problema diventa uno
stato `unavailable` con un motivo esplicito (`TIMEOUT`, `MS_UNAVAILABLE`,
`SERVICE_UNAVAILABLE`, `MS_MAX_CONCURRENT_REQ`, `GLOBAL_MAX_CONCURRENT_REQ`,
`NETWORK`, `UNEXPECTED`), e la UI degrada dicendo chiaramente all'utente che
*non sa*, invece di far passare un'assenza di risposta per un esito negativo.
L'attesa è interrotta dopo 5 secondi (`VIES_TIMEOUT_MS`).

La chiamata parte dalla Route Handler `/api/vies?piva=…`: il browser non
contatta mai direttamente la Commissione. Le risposte sono messe in cache per
un'ora, per non gravare su un servizio già fragile.

Nota: VIES riempie denominazione e indirizzo con `---` quando lo Stato membro
non li divulga; il provider li normalizza a `null` e la UI lo spiega.

## Archivio, cache e costi

Le interrogazioni ai provider camerali si pagano a chiamata, quindi la regola
è: **non ricomprare un dato che si ha già**. `getCompany()` in
[`src/lib/companies/repository.ts`](src/lib/companies/repository.ts) segue
sempre lo stesso ordine:

1. **cache calda** (Redis, 24 ore) — nessun costo;
2. **archivio permanente** (Postgres) — nessun costo, se il record è più
   recente di `REFRESH_AFTER_DAYS` (default 30);
3. **provider a pagamento** — solo se l'archivio è vuoto, il record è stantio,
   o l'utente ha chiesto esplicitamente l'aggiornamento (`?refresh=1`).

Se il provider non risponde ma in archivio c'è un record vecchio, viene
mostrato quello con `source: "database-stale"` e la data di scarico: un dato
datato e dichiarato tale è più utile di una pagina d'errore. Al contrario, se
il provider risponde "non esiste", quella risposta è autorevole e non si
ripiega sull'archivio.

Ogni chiamata effettivamente pagata finisce nella tabella `api_calls` con il
costo stimato, la durata e l'esito, così la spesa è verificabile con una query
invece che a fine mese sulla fattura.

Il portale funziona anche **senza** database e senza Redis: degrada a cache in
memoria e paga ogni interrogazione. Utile in sviluppo, da non fare in
produzione.

### Nota sul `search_log`

Il piano iniziale prevedeva anche una tabella con le ricerche degli utenti.
Non è stata creata: registrare le query è un trattamento di dati personali che
va dichiarato nell'informativa e difeso, e al momento non serve a nessuna
funzionalità. Se in futuro servirà per le statistiche, meglio introdurla
consapevolmente e in forma aggregata.

## Aggiungere un provider dati (dallo step 4)

I provider vivranno in `src/lib/providers/` e implementeranno tutti la stessa
interfaccia `CompanyProvider`, così la UI non cambia mai al cambiare del
fornitore:

1. crea `src/lib/providers/<nome>.ts` con una classe che implementa
   `CompanyProvider` (vedi `cerved.ts` come scheletro);
2. valida la risposta esterna con uno schema zod e mappala su `CompanyData`;
3. aggiungi il nome all'enum `COMPANY_PROVIDER` in `src/lib/env.ts` e un ramo
   alla factory in `src/lib/providers/index.ts`;
4. dichiara la sua variabile d'ambiente in `.env.example` e nello schema zod;
5. seleziona il provider con `COMPANY_PROVIDER`.

Regole a cui ogni provider deve attenersi:

- **non lanciare mai**: ogni problema diventa `{ status: "unavailable",
  reason }`, e l'indisponibilità va tenuta distinta da `not-found`;
- **validare con zod**: se la risposta non ha la forma attesa, meglio un
  `UNEXPECTED` rumoroso che una scheda plausibile ma sbagliata;
- **dichiarare `costPerLookupEur`**: è ciò che finisce in `api_calls`.

### Stato di `openapi.ts`

L'adapter openapi.it è scritto ma **non ancora verificato contro l'API reale**,
perché richiede un account. Trasporto, autenticazione, timeout e mappatura
degli errori HTTP sono coperti da test; la corrispondenza dei singoli campi va
confermata su una risposta vera prima di impostare `COMPANY_PROVIDER=openapi`.
Anche i costi in `COSTO_PER_LIVELLO` sono indicativi e vanno allineati al
listino.

## Deploy su Vercel

1. Importa il repository su Vercel (framework rilevato: Next.js).
2. Configura le variabili d'ambiente di `.env.example` per Production e Preview.
3. Collega Neon (o Vercel Postgres) e Upstash Redis dal marketplace di Vercel.
4. Le migrazioni Drizzle vanno eseguite prima del deploy (`npm run db:migrate`).

## Nota di licenza sui dati

I termini di quasi tutti i provider di dati camerali limitano la
**ripubblicazione** dei dati su un sito pubblico indicizzabile. Verifica il
contratto del provider prima di attivare la cache permanente, la sitemap
dinamica e il JSON-LD sulle schede azienda. VIES non ha questa restrizione.
