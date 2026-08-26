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
| 3 | Provider VIES + `/verifica-partita-iva` | ⬜ |
| 4 | Schema DB, cache, provider camerale | ⬜ |
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

## Aggiungere un provider dati (dallo step 4)

I provider vivranno in `src/lib/providers/` e implementeranno tutti la stessa
interfaccia `CompanyProvider`, così la UI non cambia mai al cambiare del
fornitore:

1. crea `src/lib/providers/<nome>.ts` che esporta un oggetto `CompanyProvider`;
2. valida la risposta esterna con uno schema zod e mappala sul tipo `Company`;
3. registra il provider nella factory in `src/lib/providers/index.ts`;
4. aggiungi la sua variabile d'ambiente in `.env.example` e allo schema zod;
5. seleziona il provider con `COMPANY_PROVIDER`.

Ogni chiamata a pagamento va loggata nella tabella `api_calls` con il costo
stimato, e il risultato salvato in Postgres per essere riusato.

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
