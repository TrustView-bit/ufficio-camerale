# Script di caricamento

Si eseguono **a mano**, e i file JSON che producono sono committati in `data/`:
nessun build deve dipendere dalla raggiungibilità di una fonte esterna.

| Comando | Cosa fa |
|---|---|
| `npm run build:ateco` | Struttura ATECO 2025 e raccordo con la 2022, da Istat |
| `npm run build:comuni` | Comuni, province, CAP e coordinate |
| `python3 scripts/estrai-imprese.py <formato> <file> [origine]` | Imprese di sviluppo |

## Formati di `estrai-imprese.py`

| Formato | Sorgente | Colonne |
|---|---|---|
| `elenco-imprese` | PDF | ragione sociale, sede legale, partita IVA |
| `rete-vendita` | PDF | codice, ragione sociale, indirizzo, comune, frazione, provincia, CAP, partita IVA, canale, zona |
| `tabella` | TSV con intestazione | `denominazione`, `partitaIva`, e facoltativi `via`, `cap`, `comune`, `provincia` |
| `demo-json` | JSON | dataset dimostrativo completo, marcato `dati_fittizi` |

I record vengono **uniti** a quelli già presenti, con la partita IVA come
chiave. Le partite IVA con cifra di controllo errata vengono scartate.


## Importazione di un archivio reale

```bash
npm run import -- --fonte=telemaco-indirizzi --file=./data/lombardia-01.csv
```

| Opzione | Effetto |
|---|---|
| `--fonte=<nome>` | `telemaco-indirizzi`, `telemaco-esteso`, `ipa-csv`, `anac-csv`, `rna-xml` |
| `--file=<percorso>` | il file da leggere |
| `--data=<ISO>` | quando il dato è stato acquisito (default: adesso) |
| `--blocco=<n>` | righe per transazione, default 1000 |
| `--riprendi` | riparte dal blocco in cui si era interrotto |
| `--prova` | valida tutto senza scrivere in archivio |

**Le righe non valide non bloccano l'importazione.** Finiscono in
`scarti/scarti-<fonte>-<data>.csv` con il motivo e il numero di riga, e il
riepilogo dice quante ne sono state scartate e perché. Un archivio reale è
pieno di buchi: rifiutare l'intero file per una riga storta sarebbe inutile.

### Precedenza fra le fonti

La stessa impresa arriva da più elenchi. Tre regole, in ordine:

1. **un campo valorizzato non viene mai sovrascritto da un campo vuoto** — è
   l'errore che rovina un archivio costruito da più fonti, perché quella più
   povera cancellerebbe il lavoro di quella più ricca;
2. a parità di campo vince la fonte con priorità più alta (provider a
   pagamento > Telemaco > fonti aperte);
3. a parità di priorità vince il dato acquisito più di recente.

La tabella `impresa_fonti` registra **quale fonte ha fornito quale campo e
quando**: serve a rispondere «questo dato viene da qui» quando un'impresa
contesta ciò che pubblichiamo.

### Idempotenza

Reimportare lo stesso file non produce duplicati e non tocca i timestamp di
aggiornamento: un campo viene riscritto solo se cambia davvero. C'è un test
che lo dimostra su Postgres vero.

### Stato degli adapter

`ipa-csv`, `anac-csv` e `rna-xml` leggono formati documentati e aperti.
**Gli adapter Telemaco non sono ancora stati provati su un'estrazione vera**:
le intestazioni vengono dalla documentazione del tracciato. Per questo ogni
campo è cercato fra più nomi possibili e, se nel file non si trovano né la
partita IVA né la denominazione, l'adapter si ferma elencando le colonne che
ha trovato — meglio un errore esplicito che un'importazione silenziosamente
vuota.
