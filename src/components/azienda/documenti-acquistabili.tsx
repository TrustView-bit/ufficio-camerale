"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentiPer, formatPrezzo, type Documento } from "@/lib/documenti";

/**
 * I documenti camerali ordinabili, presentati come un listino: una riga per
 * documento, prezzo a destra in cifre incolonnate.
 *
 * «Ordina» non avvia un pagamento: apre una finestra in cui l'utente lascia
 * i propri recapiti, la richiesta finisce in archivio e chi gestisce il
 * portale risponde per email con il collegamento per procedere all'acquisto.
 * La finestra lo dice prima che l'utente compili qualcosa.
 */
export function DocumentiAcquistabili({
  partitaIva,
  denominazione,
  eSocieta,
}: {
  partitaIva: string;
  denominazione: string;
  eSocieta: boolean;
}) {
  const documenti = documentiPer({ eSocieta });
  const [scelto, setScelto] = useState<Documento | null>(null);

  return (
    <section className="print:hidden">
      <h2 className="border-foreground mb-4 border-b-2 pb-1.5 text-sm font-semibold tracking-[0.08em] uppercase">
        Documenti ufficiali
      </h2>

      <ul className="border-border divide-border bg-card divide-y border">
        {documenti.map((documento) => (
          <li
            key={documento.id}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{documento.nome}</h3>
              <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                {documento.descrizione}
              </p>
            </div>

            <span className="num w-24 text-right text-sm font-semibold tabular-nums">
              {formatPrezzo(documento.prezzo)}
            </span>

            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setScelto(documento)}
              aria-label={`Ordina ${documento.nome}`}
            >
              Ordina
            </Button>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-3 text-xs">
        Prezzi indicativi, IVA esclusa. I documenti sono rilasciati dal Registro
        Imprese: Catalogo Imprese non emette atti con valore legale.
      </p>

      {scelto && (
        <FinestraRichiesta
          documento={scelto}
          partitaIva={partitaIva}
          denominazione={denominazione}
          onChiudi={() => setScelto(null)}
        />
      )}
    </section>
  );
}

type Fase =
  | { stato: "compila" }
  | { stato: "invio" }
  | { stato: "inviata"; id: number }
  | { stato: "errore"; messaggio: string; campi: Record<string, string> };

/**
 * La finestra è un `<dialog>` nativo: il browser gestisce da sé il fuoco,
 * il tasto Esc e lo sfondo, e i lettori di schermo la riconoscono senza
 * ruoli aggiunti a mano.
 */
function FinestraRichiesta({
  documento,
  partitaIva,
  denominazione,
  onChiudi,
}: {
  documento: Documento;
  partitaIva: string;
  denominazione: string;
  onChiudi: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [fase, setFase] = useState<Fase>({ stato: "compila" });
  const idTitolo = useId();
  const idNome = useId();
  const idEmail = useId();
  const idTelefono = useId();
  const idNote = useId();
  const idConsenso = useId();

  useEffect(() => {
    const finestra = ref.current;
    if (!finestra || finestra.open) return;
    finestra.showModal();
  }, []);

  async function invia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dati = new FormData(event.currentTarget);

    setFase({ stato: "invio" });

    let risposta: Response;
    try {
      risposta = await fetch("/api/richieste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partitaIva,
          denominazione,
          documentoId: documento.id,
          nome: dati.get("nome"),
          email: dati.get("email"),
          telefono: dati.get("telefono"),
          note: dati.get("note"),
          consenso: dati.get("consenso") === "on",
        }),
      });
    } catch {
      setFase({
        stato: "errore",
        messaggio: "Non riusciamo a contattare il server. Controlla la connessione e riprova.",
        campi: {},
      });
      return;
    }

    const corpo = (await risposta.json().catch(() => ({}))) as {
      ok?: boolean;
      id?: number;
      error?: string;
      campi?: { campo: string; messaggio: string }[];
    };

    if (risposta.ok && corpo.ok && typeof corpo.id === "number") {
      setFase({ stato: "inviata", id: corpo.id });
      return;
    }

    setFase({
      stato: "errore",
      messaggio: corpo.error ?? "Qualcosa non ha funzionato. Riprova.",
      campi: Object.fromEntries(
        (corpo.campi ?? []).map((voce) => [voce.campo, voce.messaggio]),
      ),
    });
  }

  const campi = fase.stato === "errore" ? fase.campi : {};
  const inInvio = fase.stato === "invio";

  return (
    <dialog
      ref={ref}
      onClose={onChiudi}
      onClick={(event) => {
        // un click sullo sfondo, fuori dal riquadro, chiude
        if (event.target === ref.current) ref.current?.close();
      }}
      aria-labelledby={idTitolo}
      className="bg-card text-foreground border-border m-auto w-[min(100%-2rem,34rem)] border p-0 shadow-lg backdrop:bg-black/40"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={idTitolo} className="text-lg font-semibold tracking-tight">
              Richiedi: {documento.nome}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {denominazione} · P.IVA{" "}
              <span className="num text-foreground">{partitaIva}</span> ·{" "}
              <span className="num">{formatPrezzo(documento.prezzo)}</span> IVA
              esclusa
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Chiudi"
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {fase.stato === "inviata" ? (
          <div className="mt-5 space-y-4 text-sm">
            <p className="text-success flex items-start gap-2 font-medium">
              <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              Richiesta ricevuta (n. {fase.id}).
            </p>
            <p className="text-muted-foreground">
              Ti scriveremo all&apos;indirizzo indicato con il collegamento per
              completare l&apos;acquisto. Non è stato addebitato nulla.
            </p>
            <Button type="button" onClick={() => ref.current?.close()}>
              Chiudi
            </Button>
          </div>
        ) : (
          <form onSubmit={invia} noValidate className="mt-5 space-y-4">
            <p className="text-muted-foreground text-sm">
              Lascia i tuoi recapiti: ti rispondiamo per email con il collegamento
              per procedere all&apos;acquisto. Nessun pagamento parte da qui.
            </p>

            <Campo id={idNome} etichetta="Nome e cognome" errore={campi.nome}>
              <Input
                id={idNome}
                name="nome"
                autoComplete="name"
                required
                aria-invalid={Boolean(campi.nome)}
              />
            </Campo>

            <Campo id={idEmail} etichetta="Email" errore={campi.email}>
              <Input
                id={idEmail}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                aria-invalid={Boolean(campi.email)}
              />
            </Campo>

            <Campo
              id={idTelefono}
              etichetta="Telefono (facoltativo)"
              errore={campi.telefono}
            >
              <Input
                id={idTelefono}
                name="telefono"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
              />
            </Campo>

            <Campo id={idNote} etichetta="Note (facoltativo)" errore={campi.note}>
              <textarea
                id={idNote}
                name="note"
                rows={3}
                maxLength={1000}
                className="border-input bg-background w-full border px-3 py-2 text-sm"
              />
            </Campo>

            <div className="flex items-start gap-2 text-sm">
              <input
                id={idConsenso}
                name="consenso"
                type="checkbox"
                required
                className="mt-1 size-4 shrink-0"
                aria-invalid={Boolean(campi.consenso)}
              />
              <label htmlFor={idConsenso} className="text-muted-foreground">
                Acconsento al trattamento dei dati per rispondere a questa
                richiesta, come descritto nell&apos;
                <Link href="/privacy" className="text-primary underline">
                  informativa privacy
                </Link>
                .
                {campi.consenso && (
                  <span className="text-danger block">{campi.consenso}</span>
                )}
              </label>
            </div>

            {fase.stato === "errore" && (
              <p
                role="alert"
                className="border-danger/40 bg-danger-subtle/40 text-danger flex items-start gap-2 border-l-4 px-3 py-2 text-sm"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {fase.messaggio}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => ref.current?.close()}
                disabled={inInvio}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={inInvio}>
                {inInvio ? "Invio in corso…" : "Invia richiesta"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

function Campo({
  id,
  etichetta,
  errore,
  children,
}: {
  id: string;
  etichetta: string;
  errore?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {etichetta}
      </label>
      {children}
      {errore && <p className="text-danger text-xs">{errore}</p>}
    </div>
  );
}
