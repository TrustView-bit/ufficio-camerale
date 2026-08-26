#!/usr/bin/env python3
"""
Estrae imprese da elenchi, per usarle come dati di sviluppo.

    python3 scripts/estrai-imprese.py <formato> <file> [origine]

Formati riconosciuti:
    elenco-imprese   PDF: ragione sociale | sede legale | partita IVA
    rete-vendita     PDF: codice | ragione sociale | indirizzo | comune |
                     frazione | provincia | CAP | partita IVA | canale | zona
    tabella          TSV con intestazione: denominazione, partitaIva, via,
                     comune, provincia. Serve per gli elenchi che arrivano
                     già in forma tabellare invece che dentro un PDF.
    demo-json        JSON dimostrativo completo. Ogni record deve dichiarare
                     dati_fittizi="SI": i record non marcati vengono scartati,
                     perché il campo è ciò che permette alla scheda di
                     avvertire che i dati sono inventati.

I record vengono UNITI a data/imprese-sviluppo.json, non sovrascritti: più
elenchi possono contribuire allo stesso dataset. La chiave è la partita IVA;
le righe che condividono la stessa partita diventano unità locali della stessa
impresa.

COSA VIENE ESTRATTO DI PROPOSITO, E COSA NO
-------------------------------------------
Solo i campi identificativi: ragione sociale, sede, partita IVA, indirizzi
delle unità locali. Sono gli stessi dati che risultano da una visura camerale.

Vengono SCARTATE le colonne che legano l'impresa al contesto dell'elenco di
origine — nel caso di un procedimento amministrativo: attività richiesta, data
d'istanza, esito. Non è una dimenticanza: elenchi di quel tipo contengono
ditte individuali, cioè persone fisiche, e associare un nome e cognome al
procedimento su un sito indicizzabile è un trattamento diverso dalla
pubblicazione istituzionale per trasparenza.

Non riaggiungere quelle colonne senza una valutazione legale.

Non richiede dipendenze esterne: usa solo la libreria standard.
"""

import json
import pathlib
import re
import sys
import zlib

RADICE = pathlib.Path(__file__).resolve().parent.parent
DESTINAZIONE = RADICE / "data" / "imprese-sviluppo.json"

# Per ogni formato: i limiti orizzontali delle colonne, letti dalla posizione
# del testo nella pagina. Attenzione: le intestazioni stanno spesso a
# coordinate diverse dai dati, quindi i limiti si ricavano dai dati.
FORMATI = {
    "elenco-imprese": [(200, "denominazione"), (410, "sede"), (470, "piva")],
    "rete-vendita": [
        (80, "codice"),
        (300, "denominazione"),
        (450, "indirizzo"),
        (540, "comune"),
        (568, "frazione"),
        (580, "provincia"),
        (600, "cap"),
        (632, "piva"),
        (682, "canale"),
        (99999, "zona"),
    ],
}


def flussi_testo(pdf: bytes):
    for m in re.finditer(rb"stream\r?\n", pdf):
        inizio = m.end()
        fine = pdf.find(b"endstream", inizio)
        if fine == -1:
            continue
        try:
            decompresso = zlib.decompress(pdf[inizio:fine])
        except zlib.error:
            continue
        if b"BT" in decompresso:
            yield decompresso


def testo_del_blocco(blocco: bytes) -> str:
    return "".join(
        p[1:-1]
        .replace(b"\\(", b"(")
        .replace(b"\\)", b")")
        .replace(b"\\\\", b"\\")
        .decode("latin1")
        for p in re.findall(rb"\((?:\\.|[^\\()])*\)", blocco)
    )


def frammenti(pdf: bytes):
    """Ogni pezzo di testo con la sua posizione: (pagina, y, x, testo)."""
    for pagina, flusso in enumerate(flussi_testo(pdf)):
        for blocco in re.finditer(rb"BT(.*?)ET", flusso, re.S):
            corpo = blocco.group(1)
            testo = testo_del_blocco(corpo).strip()
            if not testo:
                continue

            matrice = re.findall(
                rb"([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+"
                rb"([\d.\-]+)\s+([\d.\-]+)\s+Tm",
                corpo,
            )
            if matrice:
                x, y = float(matrice[-1][4]), float(matrice[-1][5])
            else:
                spostamento = re.findall(rb"([\d.\-]+)\s+([\d.\-]+)\s+T[dD]", corpo)
                if not spostamento:
                    continue
                x, y = float(spostamento[-1][0]), float(spostamento[-1][1])

            yield pagina, round(y, 1), round(x, 1), testo


def righe_della_tabella(pdf: bytes, tolleranza: float):
    """Le celle sulla stessa altezza appartengono alla stessa riga."""
    pezzi = sorted(frammenti(pdf), key=lambda f: (f[0], -f[1], f[2]))

    righe = []
    corrente = None
    for pagina, y, x, testo in pezzi:
        if corrente and corrente["pagina"] == pagina and abs(corrente["y"] - y) < tolleranza:
            corrente["celle"].append((x, testo))
        else:
            corrente = {"pagina": pagina, "y": y, "celle": [(x, testo)]}
            righe.append(corrente)

    return righe


def cifra_di_controllo_valida(piva: str) -> bool:
    """Algoritmo di Luhn della Partita IVA italiana."""
    if not re.fullmatch(r"\d{11}", piva):
        return False
    somma = 0
    for i, carattere in enumerate(piva[:10]):
        cifra = int(carattere)
        if i % 2 == 0:
            somma += cifra
        else:
            doppio = cifra * 2
            somma += doppio - 9 if doppio > 9 else doppio
    return (10 - somma % 10) % 10 == int(piva[10])


def ripulisci(testo: str) -> str:
    return re.sub(r"\s+", " ", testo).strip()


def estrai_elenco_imprese(pdf: bytes):
    colonne = FORMATI["elenco-imprese"]

    def colonna(x):
        for limite, nome in colonne:
            if x < limite:
                return nome
        return None

    record = []
    ultimo = None

    for riga in righe_della_tabella(pdf, tolleranza=6):
        campi = {"denominazione": [], "sede": [], "piva": []}
        for x, testo in riga["celle"]:
            nome = colonna(x)
            if nome:
                campi[nome].append(testo)

        piva = " ".join(campi["piva"]).strip()

        if re.fullmatch(r"\d{11}", piva):
            ultimo = {
                "denominazione": " ".join(campi["denominazione"]),
                "sedeTesto": " ".join(campi["sede"]),
                "piva": piva,
            }
            record.append(ultimo)
        elif ultimo is not None:
            # una cella andata a capo prosegue sulla riga successiva
            if campi["denominazione"]:
                ultimo["denominazione"] += " " + " ".join(campi["denominazione"])
            if campi["sede"]:
                ultimo["sedeTesto"] += " " + " ".join(campi["sede"])

    imprese = {}
    for r in record:
        denominazione = ripulisci(r["denominazione"])
        if not denominazione or denominazione.startswith("Ragione"):
            continue
        if not cifra_di_controllo_valida(r["piva"]) or r["piva"] in imprese:
            continue

        imprese[r["piva"]] = {
            "partitaIva": r["piva"],
            "denominazione": denominazione,
            "sedeTesto": ripulisci(r["sedeTesto"]) or None,
            "unitaLocali": [],
        }

    return imprese


def estrai_rete_vendita(pdf: bytes):
    colonne = FORMATI["rete-vendita"]

    def colonna(x):
        for limite, nome in colonne:
            if x < limite:
                return nome
        return "zona"

    imprese = {}

    for riga in righe_della_tabella(pdf, tolleranza=5):
        campi = {}
        for x, testo in riga["celle"]:
            campi.setdefault(colonna(x), []).append(testo)

        unisci = lambda chiave: ripulisci(" ".join(campi.get(chiave, [])))
        piva = unisci("piva")

        if not cifra_di_controllo_valida(piva):
            continue

        denominazione = unisci("denominazione")
        if not denominazione:
            continue

        sede = {
            "via": unisci("indirizzo") or None,
            "cap": unisci("cap") or None,
            "comune": unisci("comune") or None,
            "provincia": unisci("provincia") or None,
        }

        impresa = imprese.setdefault(
            piva,
            {
                "partitaIva": piva,
                "denominazione": denominazione,
                "sede": sede,
                "unitaLocali": [],
            },
        )

        # la prima riga è la sede, le successive sono unità locali
        if impresa["sede"] != sede:
            impresa["unitaLocali"].append(sede)

    return imprese


def estrai_tabella(contenuto: bytes):
    """Legge un TSV con intestazione. Nessuna magia: le colonne sono nomi."""
    righe = contenuto.decode("utf8").splitlines()
    if not righe:
        return {}

    intestazioni = [c.strip() for c in righe[0].split("\t")]
    necessarie = {"denominazione", "partitaIva"}
    if not necessarie.issubset(intestazioni):
        print(
            f"✗ il TSV deve avere almeno le colonne {sorted(necessarie)}.\n"
            f"  Trovate: {intestazioni}"
        )
        return {}

    imprese = {}
    for riga in righe[1:]:
        if not riga.strip():
            continue
        valori = dict(zip(intestazioni, [c.strip() for c in riga.split("\t")]))

        piva = valori.get("partitaIva", "").replace("IT", "").strip()
        denominazione = ripulisci(valori.get("denominazione", ""))

        if not denominazione or not cifra_di_controllo_valida(piva):
            continue

        imprese[piva] = {
            "partitaIva": piva,
            "denominazione": denominazione,
            "sede": {
                "via": valori.get("via") or None,
                "cap": valori.get("cap") or None,
                "comune": valori.get("comune") or None,
                "provincia": valori.get("provincia") or None,
            },
            "unitaLocali": [],
        }

    return imprese


# Le diciture dello stato attività, riportate al nostro vocabolario.
# "inattiva" non è "cessata": iscritta ma non operativa.
STATI = {
    "attiva": "attiva",
    "inattiva": "inattiva",
    "in liquidazione": "in-liquidazione",
    "cessata": "cessata",
}


def numero(valore):
    if isinstance(valore, (int, float)):
        return valore
    if isinstance(valore, str) and valore.strip():
        try:
            return float(valore.replace(",", "."))
        except ValueError:
            return None
    return None


def estrai_demo_json(contenuto: bytes):
    """
    Dataset dimostrativo: si possono usare tutti i campi, perché le aziende
    non esistono. Proprio per questo ogni record deve dichiararlo, e la
    scheda lo mostrerà: una scheda finta indistinguibile da una vera sarebbe
    un'informazione falsa.
    """
    dati = json.loads(contenuto.decode("utf8"))
    if isinstance(dati, dict):
        for valore in dati.values():
            if isinstance(valore, list):
                dati = valore
                break

    if not isinstance(dati, list):
        print("✗ il JSON deve contenere un elenco di aziende.")
        return {}

    imprese = {}
    non_marcati = 0

    for record in dati:
        if not isinstance(record, dict):
            continue

        if str(record.get("dati_fittizi", "")).strip().upper() != "SI":
            non_marcati += 1
            continue

        piva = str(record.get("partita_iva") or "").replace("IT", "").strip()
        piva = piva.zfill(11) if piva.isdigit() else piva
        denominazione = ripulisci(str(record.get("ragione_sociale") or ""))

        if not denominazione or not cifra_di_controllo_valida(piva):
            continue

        rea = str(record.get("rea") or "").strip()
        cciaa, _, numero_rea = rea.partition("-")

        anno = record.get("anno_costituzione")

        cap = str(record.get("cap") or "").strip()
        imprese[piva] = {
            "partitaIva": piva,
            "denominazione": denominazione,
            "codiceFiscale": str(record.get("codice_fiscale") or "").strip() or None,
            "formaGiuridica": ripulisci(str(record.get("forma_giuridica") or "")) or None,
            "statoAttivita": STATI.get(
                str(record.get("stato_attivita") or "").strip().lower(), "sconosciuto"
            ),
            # si conosce l'anno, non il giorno: non si inventa una data intera
            "annoCostituzione": int(anno) if isinstance(anno, int) else None,
            "reaCciaa": cciaa.strip() or None if numero_rea else None,
            "reaNumero": (numero_rea or cciaa).strip() or None,
            "capitaleSociale": numero(record.get("capitale_sociale")),
            "dipendenti": numero(record.get("numero_dipendenti")),
            "atecoPrimario": str(record.get("ateco_2022") or "").strip() or None,
            "atecoVersione": "2022" if record.get("ateco_2022") else None,
            "pec": str(record.get("pec") or "").strip() or None,
            "telefono": str(record.get("telefono") or "").strip() or None,
            "sitoWeb": str(record.get("sito_web") or "").strip() or None,
            "sede": {
                "via": ripulisci(str(record.get("indirizzo") or "")) or None,
                "cap": cap.zfill(5) if cap.isdigit() else (cap or None),
                "comune": ripulisci(str(record.get("comune") or "")) or None,
                "provincia": str(record.get("provincia") or "").strip() or None,
            },
            "unitaLocali": [],
            "fittizia": True,
        }

    if non_marcati:
        print(f"  ⚠ {non_marcati} record scartati perché non marcati dati_fittizi=SI")

    return imprese


ESTRATTORI = {
    "elenco-imprese": estrai_elenco_imprese,
    "rete-vendita": estrai_rete_vendita,
    "tabella": estrai_tabella,
    "demo-json": estrai_demo_json,
}


def carica_esistenti() -> dict:
    if not DESTINAZIONE.exists():
        return {}
    dati = json.loads(DESTINAZIONE.read_text(encoding="utf8"))
    return {i["partitaIva"]: i for i in dati.get("imprese", [])}


def main() -> int:
    if len(sys.argv) < 3 or sys.argv[1] not in ESTRATTORI:
        print(__doc__)
        return 1

    formato, percorso = sys.argv[1], pathlib.Path(sys.argv[2])
    origine = sys.argv[3] if len(sys.argv) > 3 else percorso.name

    if not percorso.exists():
        print(f"✗ file non trovato: {percorso}")
        return 1

    nuove = ESTRATTORI[formato](percorso.read_bytes())

    if not nuove:
        print(
            f"✗ nessuna impresa estratta con il formato «{formato}»: "
            "il PDF ha una struttura diversa da quella attesa."
        )
        return 1

    esistenti = carica_esistenti()
    aggiunte = sum(1 for piva in nuove if piva not in esistenti)
    for piva, impresa in nuove.items():
        impresa["origine"] = origine
        esistenti[piva] = impresa

    imprese = sorted(esistenti.values(), key=lambda i: i["denominazione"])
    unita = sum(len(i.get("unitaLocali") or []) for i in imprese)

    DESTINAZIONE.write_text(
        json.dumps(
            {
                "nota": (
                    "Dati di sviluppo. Solo campi identificativi (denominazione, "
                    "sede, partita IVA, unità locali). Ogni colonna che legava "
                    "queste imprese al contesto dell'elenco di origine è stata "
                    "scartata di proposito: non riaggiungerla senza una "
                    "valutazione legale."
                ),
                "imprese": imprese,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf8",
    )

    print(f"→ data/imprese-sviluppo.json")
    print(f"  {len(nuove)} imprese dal formato «{formato}» ({aggiunte} nuove)")
    print(f"  totale in archivio: {len(imprese)} imprese, {unita} unità locali")
    print("  Partite IVA verificate: tutte con cifra di controllo corretta.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
