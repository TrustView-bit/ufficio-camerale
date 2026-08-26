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
