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
| 5 | Scheda azienda + SEO | ✅ fatto (manca la mappa statica) |
| 6 | Descrizioni AI asincrone | ⬜ |
| 7 | Rate limiting, pagine legali, test | ✅ fatto (deploy da fare) |

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
npm run test:e2e   # test end-to-end (playwright, su build di produzione)
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

## Dataset Istat

`data/` contiene tre file JSON **committati nel repository**, generati a mano
dagli script in `scripts/`. Il build su Vercel non deve mai dipendere dalla
raggiungibilità di istat.it o di GitHub.

```bash
npm run build:ateco    # struttura ATECO 2025 + raccordo bidirezionale con la 2022
npm run build:comuni   # comuni, province, regioni e CAP
```

Istat rinomina i file a ogni aggiornamento: se un URL non risponde più, lo
script si ferma dicendo quale indirizzo cercare e dove aggiornarlo.

### Perché serve il raccordo ATECO

I fornitori di dati camerali restituiscono ancora in larga parte codici ATECO
**2022**, mentre la classificazione in vigore è la **2025**. Cercare un codice
2022 nella tabella 2025 non dà nulla: `62.01.00` non esiste in ATECO 2025,
dove la programmazione informatica è `62.10.00`.

La conversione **non è uno a uno**: 1.048 codici 2022 su 3.157 corrispondono a
più codici 2025. Quando la corrispondenza è ambigua, `descriviAteco()` risale
al livello gerarchico condiviso invece di scegliere arbitrariamente il primo
risultato, e segnala l'approssimazione con `esatta: false`.

La cascata completa: struttura 2025 → conversione dal raccordo → troncamento a
un livello superiore → `null`. **Mai una descrizione inventata.**

Nel database restano tre campi distinti — codice grezzo, versione della
classificazione, descrizione risolta — e il codice del fornitore non viene mai
sovrascritto con quello convertito: quando Istat pubblicherà il raccordo
successivo, tutto si ricalcola da capo.

### Imprese di sviluppo

`data/imprese-sviluppo.json` contiene 332 imprese reali con partita IVA vera e
127 unità locali, estratte da elenchi pubblici con
`scripts/estrai-imprese.py`. Servono a provare la resa su dati veri invece
che sui tre esempi inventati.

```bash
python3 scripts/estrai-imprese.py <formato> <file> [origine]
```

Lo script conosce due disposizioni di colonne nei PDF (`elenco-imprese`,
`rete-vendita`) e un formato tabellare (`tabella`, un TSV con intestazione, per
gli elenchi che non arrivano dentro un PDF; le sorgenti stanno in
`data/sorgenti/`). **Unisce** i record a quelli già presenti, con la partita IVA
come chiave: righe che condividono la stessa partita diventano unità locali
della stessa impresa. Legge la tabella dalle coordinate del testo nella pagina,
non dall'ordine dei frammenti, perché le celle del PDF vanno a capo e
l'accostamento per vicinanza mescola i campi.

Di queste si conoscono **solo** denominazione, sede e partita IVA, e solo
quelli vengono esposti: attribuire a un'impresa esistente un codice ATECO, un
capitale o un numero REA inventati significherebbe pubblicare informazioni
false su un soggetto reale. I campi mancanti restano `null` e la scheda non
mostra quelle sezioni — che è anche un buon banco di prova per il caso «dati
scarsi».

Lo script scarta di proposito ogni colonna che legava quelle imprese al
procedimento amministrativo di origine. L'elenco conteneva ditte individuali,
cioè persone fisiche: **non riaggiungere quelle colonne senza una valutazione
legale.**

### Comuni

`normalizzaComune()` in `src/lib/geo.ts` riconosce un comune scritto in
qualunque modo: maiuscolo, senza accenti, con o senza apostrofi, o nella forma
bilingue con la barra (`Bolzano/Bozen`). Serve soprattutto agli indirizzi VIES,
che arrivano tutti in maiuscolo: `"LARGO FRANCESCO RICHINI 6 \n20122 MILANO MI"`
diventa via, CAP, comune e provincia riconosciuti.

La sorgente dei comuni ha due difetti sistematici, entrambi corretti in fase
di build e segnalati a schermo. Il **CAP** è passato per un tipo numerico e ha
perso lo zero iniziale in 848 comuni su 7904 (Spigno Saturnia risulta `4020`
invece di `04020`): un CAP italiano ha sempre cinque cifre, quindi si
ricostruisce con certezza.

Le coordinate del centro di ogni comune servono a centrare la mappa statica
nelle schede. Anche qui la sorgente ne sbaglia alcune: undici righe scrivono la
coordinata senza punto decimale (`45581` invece di `45.581`) e vengono
ricostruite in automatico, perché nessuna coordinata italiana supera 47,2 di
latitudine; per Brescia, collocata 31 km a nord-est del centro città, c'è una
correzione manuale motivata nello script. Al termine nessuna coordinata cade
fuori dai confini d'Italia.

Due limiti dichiarati: il dataset contiene i soli nomi **italiani** dei comuni,
quindi `Bozen` da solo non risolve (`Bolzano/Bozen` sì); e sei nomi sono usati
da più comuni (Samone, Calliano, Livo, Peglio, Castro, Castello), per i quali
senza provincia si restituisce `null` invece di scegliere a caso.

## Ricerca e consultazione

`/ricerca` è insieme pagina dei risultati ed elenco navigabile: senza query
mostra tutte le aziende in ordine alfabetico, impaginate, con i filtri per
provincia. Ogni scheda dell'elenco è un collegamento all'indirizzo canonico
dell'azienda.

La ricerca per ragione sociale è un metodo **facoltativo** di
`CompanyProvider`: chi non la offre semplicemente non lo implementa, e la
pagina lo dice apertamente invece di mostrare zero risultati come se non
esistesse nulla.

Il confronto passa da `src/lib/ricerca.ts`, che appiattisce accenti e
punteggiatura — le ragioni sociali sono piene di «S.R.L.» e «SOCIETA'
COOPERATIVA» — e richiede che **tutte** le parole digitate compaiano: chi
cerca due parole non vuole i risultati che ne contengono una sola.

Nota: `robots.txt` esclude `/ricerca` dall'indicizzazione. Le pagine di
risultato non hanno contenuto proprio, e tenerle fuori riduce la superficie di
ripubblicazione. Le schede azienda restano indicizzabili.

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

## Schede azienda

Ogni impresa ha un solo indirizzo canonico:
`/azienda/<denominazione-slug>-<partita-iva>`. La Partita IVA in coda è
l'identificatore stabile — la denominazione può cambiare, il numero no — e
uno slug non canonico viene rediretto con un 308 sul canonico, così i motori
di ricerca vedono un URL solo.

Cercare una Partita IVA valida porta direttamente alla scheda: una P.IVA
identifica una sola impresa, e mostrare una lista di un elemento sarebbe un
passaggio inutile.

Le schede si rigenerano al massimo una volta all'ora (ISR). Ciascuna espone
dati strutturati `Organization` e un'immagine Open Graph generata al volo.
Il pulsante «Stampa o PDF» usa `window.print()` con un foglio di stile
dedicato in `globals.css`: niente dipendenze e niente generazione lato server.

### Mappa statica

`MappaStatica` compone le tile di OpenStreetMap in un riquadro fisso: nessuna
libreria, nessun iframe, nessun JavaScript, solo immagini posizionate. Le
coordinate sono quelle del **centro del comune**, non del numero civico — per
puntare l'indirizzo esatto servirebbe una geocodifica — e la didascalia lo
dichiara invece di lasciarlo intendere.

Le tile pubbliche di `openstreetmap.org` hanno una politica d'uso che
scoraggia il traffico elevato: prima di mettere il sito sotto carico vero
conviene passare a un fornitore di tile proprio.

### Documenti ordinabili

`src/lib/documenti.ts` elenca i documenti camerali con i relativi prezzi. **I
prezzi sono segnaposto e l'ordine non è attivo**: non c'è un fornitore
collegato né un incasso. I pulsanti sono disabilitati e la sezione lo dichiara
apertamente — un pulsante d'acquisto che sembra funzionante ma non lo è
sarebbe peggio di nessun pulsante.

## Limite di richieste

Dieci ricerche al minuto e cento al giorno per indirizzo IP, applicate alle
Route Handler in `src/lib/rate-limit/`. Con Upstash configurato il conteggio è
condiviso fra le istanze; senza, si ripiega su un contatore in memoria che
vale solo per il singolo processo — in sviluppo va bene, in produzione **non
protegge davvero**.

Se Redis è irraggiungibile il limite lascia passare: un contatore rotto non
deve trasformarsi in un blocco totale del servizio. Le risposte portano le
intestazioni `RateLimit-*` e, quando bloccano, un `Retry-After` e un messaggio
che dice fra quanto riprovare.

## Pagine legali

Informativa privacy, termini, cookie e chi siamo sono scritte, non più
segnaposto. **Non sono però definitive**: i dati identificativi del titolare
del trattamento vivono in `src/lib/site-config.ts` e sono ancora da compilare.
Finché restano tali, ogni pagina legale mostra un avviso ben visibile che si
spegne da solo appena i campi vengono riempiti.

I testi non sono stati esaminati da un legale. Vanno fatti rivedere prima di
pubblicare, in particolare la base giuridica dichiarata (legittimo interesse) e
la procedura di rettifica per le imprese individuali.

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
