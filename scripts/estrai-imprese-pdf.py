#!/usr/bin/env python3
"""
Estrae denominazione, sede e partita IVA da un elenco di imprese in PDF, per
usarli come dati di sviluppo.

    python3 scripts/estrai-imprese-pdf.py <file.pdf> [origine]

COSA VIENE ESTRATTO DI PROPOSITO, E COSA NO
-------------------------------------------
Vengono presi solo i campi identificativi: ragione sociale, sede legale,
partita IVA. Sono gli stessi dati che risultano dalla visura camerale di
qualunque impresa.

Vengono SCARTATE tutte le colonne che legano l'impresa al procedimento
amministrativo da cui proviene l'elenco — attività richiesta, data di
presentazione dell'istanza, esito. Non è una dimenticanza: gli elenchi di
questo tipo possono contenere ditte individuali, cioè persone fisiche, e
associare un nome e cognome al procedimento su un sito indicizzabile è un
trattamento diverso dalla pubblicazione istituzionale per trasparenza.

Non riaggiungere quelle colonne senza una valutazione legale.

Non richiede dipendenze esterne: usa solo la libreria standard.
"""

import json
import pathlib
import re
import sys
import zlib

RADICE = pathlib.Path(__file__).resolve().parent.parent

# Colonne individuate dalla posizione orizzontale del testo nella pagina
COLONNE = ((200, "denominazione"), (410, "sede"), (470, "piva"))


def flussi_testo(pdf: bytes):
    """I flussi compressi del PDF che contengono operatori di testo."""
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
    pezzi = re.findall(rb"\((?:\\.|[^\\()])*\)", blocco)
    return "".join(
        p[1:-1]
        .replace(b"\\(", b"(")
        .replace(b"\\)", b")")
        .replace(b"\\\\", b"\\")
        .decode("latin1")
        for p in pezzi
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


def colonna(x: float):
    for limite, nome in COLONNE:
        if x < limite:
            return nome
    return None


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


def estrai(pdf: bytes):
    pezzi = sorted(frammenti(pdf), key=lambda f: (f[0], -f[1], f[2]))

    # le celle sulla stessa altezza appartengono alla stessa riga
    righe = []
    corrente = None
    for pagina, y, x, testo in pezzi:
        if corrente and corrente["pagina"] == pagina and abs(corrente["y"] - y) < 6:
            corrente["celle"].append((x, testo))
        else:
            corrente = {"pagina": pagina, "y": y, "celle": [(x, testo)]}
            righe.append(corrente)

    record = []
    ultimo = None

    for riga in righe:
        campi = {"denominazione": [], "sede": [], "piva": []}
        for x, testo in riga["celle"]:
            nome = colonna(x)
            if nome:
                campi[nome].append(testo)

        piva = " ".join(campi["piva"]).strip()

        if re.fullmatch(r"\d{11}", piva):
            ultimo = {
                "denominazione": " ".join(campi["denominazione"]),
                "sede": " ".join(campi["sede"]),
                "piva": piva,
            }
            record.append(ultimo)
        elif ultimo is not None:
            # una cella andata a capo prosegue sulla riga successiva
            if campi["denominazione"]:
                ultimo["denominazione"] += " " + " ".join(campi["denominazione"])
            if campi["sede"]:
                ultimo["sede"] += " " + " ".join(campi["sede"])

    puliti = []
    viste = set()
    for r in record:
        denominazione = re.sub(r"\s+", " ", r["denominazione"]).strip()
        sede = re.sub(r"\s+", " ", r["sede"]).strip()

        if not denominazione or denominazione.startswith("Ragione"):
            continue
        if r["piva"] in viste or not cifra_di_controllo_valida(r["piva"]):
            continue

        viste.add(r["piva"])
        puliti.append(
            {"denominazione": denominazione, "sede": sede, "partitaIva": r["piva"]}
        )

    return puliti


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    percorso = pathlib.Path(sys.argv[1])
    origine = sys.argv[2] if len(sys.argv) > 2 else percorso.name

    if not percorso.exists():
        print(f"✗ file non trovato: {percorso}")
        return 1

    imprese = estrai(percorso.read_bytes())

    if not imprese:
        print("✗ nessuna impresa estratta: il PDF ha una struttura diversa da quella attesa.")
        return 1

    destinazione = RADICE / "data" / "imprese-sviluppo.json"
    destinazione.write_text(
        json.dumps(
            {
                "nota": (
                    "Dati di sviluppo. Solo campi identificativi (denominazione, "
                    "sede, partita IVA). Ogni colonna che legava queste imprese al "
                    "procedimento amministrativo di origine è stata scartata di "
                    "proposito: non riaggiungerla senza una valutazione legale."
                ),
                "origine": origine,
                "imprese": imprese,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf8",
    )

    individuali = sum(1 for i in imprese if "D.I." in i["denominazione"])
    print(f"→ data/imprese-sviluppo.json ({len(imprese)} imprese, {individuali} ditte individuali)")
    print("  Partite IVA verificate: tutte con cifra di controllo corretta.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
