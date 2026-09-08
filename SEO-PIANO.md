# Catalogo Imprese — piano SEO

Data della ricerca: 5 settembre 2026. Volumi mensili Italia da Google Ads (DataForSEO), posizioni dai risultati
Google Italia del giorno. Dominio previsto: catalogoimprese.com.

## 1. Cosa dicono i numeri

### Le query generiche (chi cerca "come si fa")

| query | volume/mese | chi è in prima pagina oggi |
|---|---:|---|
| verifica partita iva (+ varianti "verificare", "controllo") | 246.000 + 74.000 | Agenzia Entrate (3 risultati), visureinrete, VIES, ufficiocamerale pos. 7 |
| registro imprese | 165.000 | registroimprese.it (navigazionale, non attaccabile) |
| partita iva | 60.500 | informativa mista |
| visura camerale / online / gratis | 49.500 / 14.800 / 9.900 | competizione ALTA (CPC 2-4 €) |
| codice ateco | 27.100 | competizione bassa |
| fatturato azienda | 18.100 | competizione bassa |
| ricerca partita iva | 12.100 | ufficiocamerale pos. 4 |
| verifica partita iva comunitaria / vies | 9.900 / 6.600 / 3.600 | VIES, Agenzia Entrate |
| numero rea | 2.900 | competizione bassa, CPC 0,02 € |
| trova pec da partita iva / pec da partita iva / cerca pec da partita iva | 2.900 / 2.900 / 3.600 | ufficiocamerale **pos. 1-2** con una pagina sola |
| pec azienda | 1.900 | |
| trova azienda da partita iva | 1.600 | |
| bilancio azienda | 1.300 | |
| codice fiscale azienda | 880 | |
| aziende milano | 880 | |
| cerca pec azienda | 390 | |
| a chi appartiene partita iva | 110 | |
| azienda affidabile / affidabilità azienda | 10 / 50 | quasi nessuno lo cerca così |

### Le query con il nome dell'azienda (il vero motore di traffico)

| query | volume/mese |
|---|---:|
| eni fatturato | 1.000 |
| eni pec | 170 |
| eni sede legale | 170 |
| esselunga partita iva | 170 |
| eni codice fiscale | 110 |
| eni partita iva | 90 |
| brt partita iva | 70 |
| eni rea, eni codice sdi, brembo partita iva | sotto la soglia di misura |

Presi uno per uno sono numeri piccoli. Moltiplicati per migliaia di aziende diventano il grosso del traffico: è così
che vivono i concorrenti.

## 2. Come fanno traffico i concorrenti (misurato)

**ufficiocamerale.it**: 356.954 keyword posizionate. Le prime per volume sono **nomi di aziende** («geminit»,
«translated», «deghi», «tamoil», «bpm», «in's») dove la scheda azienda sta in prima pagina anche per il nome secco,
senza «partita iva» accanto. Poi gli strumenti gratuiti (calcolo codice fiscale: 1,2 milioni di ricerche, pos. 7-10)
e le guide (cassetto fiscale, certificato attribuzione P.IVA, come aprire la partita IVA).

**reportaziende.it**: 114.727 keyword, stesso schema: «sis ter», «brt», «bricoman», «sonepar» portano alla scheda.
In più le pagine per comune («lomazzo», «concorezzo»).

**Per «eni spa partita iva»** la prima pagina è tutta portali dati: ufficiocamerale, visura.pro, reportaziende,
fatturatoitalia, aziende.it, abbrevia, companyreports. E **l'AI Overview di Google cita ufficiocamerale.it come
prima fonte**, riprendendo alla lettera il suo titolo e la sua prima frase:

> «ENI S.P.A., Partita IVA: 00905811006, Fatturato, Dipendenti, PEC»
> «00905811006 è la partita IVA della società ENI S.P.A.. L'ENI S.P.A. ha sede in Piazza Enrico Mattei 1, 00144 Roma (RM). Nel 2022, …»

Questo è il modello da battere: una frase-fatto in apertura, soggetto + dato + luogo, che l'AI può copiare senza
interpretare.

**Cercando solo il numero «00905811006»** ufficiocamerale è primo assoluto: il numero nudo nel title e nel primo
paragrafo basta.

**Per «brembo spa affidabile»** in prima pagina ci sono Indeed, Wikipedia, MarketScreener e il sito ufficiale;
ufficiocamerale arriva ottavo. «Affidabile» non è una query da title: va coperto dentro la scheda come domanda
(vedi §4), non come parola chiave.

## 3. Cosa ci manca oggi, e senza cui nessun piano funziona

1. **Un catalogo vero e grande.** Le pagine azienda sono `noindex` finché il provider è `mock`, e oggi in archivio ci
   sono 838 imprese reali con soli nome e sede. I concorrenti ne hanno milioni. Serve una fonte massiva: elenchi
   aperti (IPA, ANAC, RNA — gli adapter esistono già in `src/lib/import/`) più openapi.it per arricchire le schede
   che vengono aperte. Senza migliaia di schede indicizzabili non c'è long tail.
2. **Il dominio online** con Search Console verificata, sitemap inviata, HTTPS.
3. **Autorità.** Dominio nuovo contro siti con 350.000 keyword: i primi mesi si vincono sulle query lunghe e sui nomi
   di aziende piccole, non su «verifica partita iva».

## 4. Il template della scheda azienda (la pagina che conta)

URL già giusto: `/azienda/<nome>-<piva>` con redirect 308 dal non canonico.

| elemento | oggi | da fare |
|---|---|---|
| `<title>` | `ENI S.P.A. · Catalogo Imprese` | `ENI S.P.A. – Partita IVA 00905811006, REA RM-756453, PEC, fatturato, sede` (nome + P.IVA + REA + i tre dati più cercati) |
| meta description | «Dati camerali di … Partita IVA …» | frase-fatto: «00905811006 è la Partita IVA di ENI S.P.A., società per azioni con sede a Roma (RM). Codice fiscale, REA, PEC, codice ATECO, fatturato 2024 e bilanci.» |
| H1 | denominazione | resta la denominazione (non si gonfia l'H1) |
| primo paragrafo (nuovo) | assente | 2-3 frasi-fatto in HTML puro, prima di qualsiasi tabella: «00905811006 è la Partita IVA di ENI S.P.A. (codice fiscale 00484960588). La società è iscritta al Registro Imprese di Roma con numero REA RM-756453, ha sede legale in Piazzale Enrico Mattei 1, 00144 Roma, e risulta attiva. Codice ATECO 19.20.1 – Raffinerie di petrolio.» Ogni frase = una query coperta (nome+piva, nome+cf, nome+rea, nome+sede, numero nudo) |
| titoli H2 | «Dati della società», «Altre informazioni» | H2 con la domanda dentro: «Partita IVA e codice fiscale di ENI S.P.A.», «Numero REA e iscrizione al Registro Imprese», «Sede legale di ENI S.P.A.», «PEC e contatti», «Fatturato e bilanci di ENI S.P.A.», «Codice ATECO e attività» |
| blocco «È affidabile?» (nuovo) | assente | H2 «ENI S.P.A. è un'azienda affidabile? Cosa dicono i dati pubblici»: solo fatti (attiva dal 1992, 34 anni di attività, capitale sociale X, ultimo bilancio depositato 2024, fatturato in crescita/calo rispetto all'anno prima, N unità locali). Mai un giudizio: la regola della casa è la stessa che serve all'AI |
| FAQ (nuovo) | assente | 4-6 domande generate dai dati, ognuna con risposta di una riga: «Qual è la partita IVA di ENI S.P.A.?», «Qual è il codice fiscale?», «Dove ha sede legale?», «Qual è la PEC?», «Qual è il numero REA?», «Quanto fattura?». Sono esattamente le «People also ask» viste nella SERP di Eni. Marcate con schema FAQPage |
| dati strutturati | Organization | Organization completo (`legalName`, `vatID`, `taxID`, `identifier` per REA, `address`, `foundingDate`, `numberOfEmployees`, `naics`/`isicV4` per ATECO) + BreadcrumbList (c'è) + FAQPage |
| link interni | comune, settore, aziende vicine | aggiungere: stessa provincia stesso settore, e le 3 aziende «cercate insieme» (stesso comune, stesso ATECO) |
| immagine OG | generata | c'è già; mettere il sigillo |
| soglia indicizzazione | ≥3 dati sostanziali | va bene; alzare a 4 quando il catalogo è ricco, per non spendere crawl budget su schede magre |

Regola per ogni frase: il dato prima, il nome dopo, nessun aggettivo. È quello che l'AI Overview ha citato.

## 5. Le altre pagine

| pagina | query bersaglio (volume) | cosa fare |
|---|---|---|
| `/verifica-partita-iva` | verifica partita iva (246k), controllo partita iva (74k), vies partita iva (3.6k), verifica partita iva comunitaria (9.9k) | title «Verifica Partita IVA gratis: controllo cifra, VIES e dati dell'azienda». Aggiungere sezione «Come verificare se una partita IVA è attiva» e «Come risalire all'azienda da una partita IVA» (le due People also ask). Il risultato deve linkare la scheda. Contro Agenzia Entrate non si vince sulla query secca: si punta su «verifica partita iva + nome azienda» e «comunitaria» |
| `/cerca-pec` (nuova) | trova pec da partita iva (2.9k), cerca pec da partita iva (3.6k), pec da partita iva (2.9k), pec azienda (1.9k), cerca pec azienda (390) | Il concorrente è primo con UNA pagina. Campo di ricerca che porta alla scheda; testo che spiega cos'è la PEC d'impresa e da dove viene il dato. Query poco contese, CPC 0,03 € |
| `/trova-azienda` (nuova) o `/ricerca` aperta all'indice | trova azienda da partita iva (1.6k), ricerca partita iva (12.1k), a chi appartiene partita iva (110) | Oggi `/ricerca` è in `robots disallow`: giusto per i risultati, ma serve UNA landing indicizzabile con la ricerca e il testo |
| `/numero-rea` (nuova guida) | numero rea (2.9k), rea azienda (90) | Guida: cos'è, dove si trova, come si legge «RM-756453», con il campo per cercare l'azienda. Pochissima competizione |
| `/attivita/[settore]` | codice ateco (27.1k) + «codice ateco 62.01» ecc. | Oggi ci sono solo le divisioni a 2 cifre. Aprire le pagine per codice completo (6 cifre) con descrizione Istat, raccordo 2022↔2025 e le aziende: la kb ATECO è già in `data/ateco.json` |
| `/aziende/[regione]/[provincia]/[comune]` | aziende milano (880), «aziende + comune» | Aggiungere sotto il titolo un paragrafo con i numeri (quante aziende, settori più frequenti, le 3 più grandi per fatturato) così la pagina non è una lista nuda. I comuni entrano in sitemap quando hanno ≥5 aziende |
| home | partita iva (60.5k), registro imprese (165k) | Non si vince; la home serve a distribuire link. Aggiungere i blocchi «Aziende per regione», «Settori», «Ultime schede aggiornate» |
| guide (nuove, 1 al mese) | come aprire partita iva (6.6k), certificato attribuzione partita iva (4.4k), visura camerale cos'è (2.4k), validità visura camerale (3.6k) | Il concorrente le usa per farsi autorità e link interni. Priorità dopo il catalogo |

## 6. Perché l'AI di Google legga i nostri dati

L'AI Overview e Gemini citano le pagine da cui possono estrarre un fatto senza ambiguità. Cosa fare, in ordine:

1. **Frase-fatto in apertura** (vedi §4). Testo in HTML servito dal server (già così: Next.js SSR/ISR), mai solo in JS.
2. **FAQ con domanda e risposta letterali**, marcate FAQPage. Le domande sono le «People also ask» reali.
3. **Organization completo in JSON-LD** con `vatID`, `taxID`, identificatore REA, indirizzo strutturato.
4. **Ogni numero una volta sola e sempre uguale**: P.IVA, CF e REA scritti nello stesso formato in title, testo,
   tabella e JSON-LD. Un AI che trova due valori diversi non cita nessuno dei due.
5. **Data del dato visibile** («Dati aggiornati al 4 settembre 2026», già c'è) e fonte dichiarata: i modelli
   preferiscono pagine con provenienza.
6. **`robots.txt`**: lasciare passare `Google-Extended`, `GPTBot`, `PerplexityBot`, `ClaudeBot` (oggi non sono
   bloccati: bene, non bloccarli). Aggiungere `/llms.txt` con la descrizione del servizio e gli URL degli indici.
7. **Nessun banner, nessun contenuto dietro click**: le schede sono già così.
8. **Le descrizioni generate** («In sintesi») restano sotto i dati e dichiarate: sono prosa, l'AI cita i fatti.

Verifica: dopo l'indicizzazione, controllo mensile su 20 query tipo «<nome> partita iva» con lo strumento
DataForSEO (AI Overview reference) per vedere chi viene citato.

## 7. Tecnica

- **Sitemap a indice**: oggi una sitemap sola con tetto a 5.000 schede. Con decine di migliaia servono
  `sitemap/aziende-1.xml`, `-2.xml` … da 10.000 URL, più una per territorio e una per settori. Next.js lo supporta
  con `generateSitemaps`.
- **ISR**: 1 ora sulle schede va bene; alzare a 24 ore per risparmiare, `revalidatePath` quando il dato cambia.
- **Canonical + 308**: già a posto.
- **Core Web Vitals**: nessun JS pesante, mappa statica: già leggero. Da misurare su Lighthouse dopo il deploy.
- **Codice fiscale di persona fisica mascherato**: resta (`mascheraCodiceFiscale`), è anche una tutela legale.
- **Search Console**: verificare dominio, inviare sitemap, monitorare «Scansionata ma non indicizzata» (sarà il
  segnale delle schede troppo magre).
- **Licenza dati**: prima di indicizzare schede arricchite da openapi.it va letto il contratto sulla ripubblicazione
  (il README lo segnala). I dati da elenchi aperti non hanno il problema.

## 8. Ordine dei lavori

| fase | cosa | perché prima |
|---|---|---|
| 0 | Dominio online, Search Console, `DATABASE_URL`, provider reale (o almeno import massivo elenchi aperti) | senza catalogo indicizzabile tutto il resto è teoria |
| 1 | Template scheda: title, description, frase-fatto, H2 con domanda, FAQ + FAQPage, Organization completo, blocco «è affidabile» | è la pagina moltiplicata per N: ogni miglioramento vale N volte |
| 2 | `/cerca-pec`, `/numero-rea`, landing «trova azienda», ATECO a 6 cifre | query poco contese dove un sito nuovo può entrare in prima pagina in settimane |
| 3 | Sitemap a indice, paragrafo dati sulle pagine comune/provincia, blocchi in home | serve quando il catalogo supera le 5.000 schede |
| 4 | Guide (1 al mese), `/llms.txt`, monitoraggio AI Overview | autorità e citazioni |

Misura del successo, per fase: fase 1 = schede indicizzate in Search Console; fase 2 = prima pagina su «pec da
partita iva» e «numero rea»; fase 3 = clic da query con nome azienda; fase 4 = citazioni in AI Overview su
almeno 5 delle 20 query campione.

## Limiti di questa ricerca

- Lo strumento dei volumi restituisce 10 keyword per chiamata: alcune query («risalire da partita iva a nome»,
  «brembo partita iva», «eni rea») sono sotto soglia o senza dato.
- Dei concorrenti ho letto le prime 40 keyword per volume e le prime 30 con «partita iva»: il quadro è chiaro ma non
  esaustivo.
- Le posizioni sono di un giorno solo, desktop, Italia.
