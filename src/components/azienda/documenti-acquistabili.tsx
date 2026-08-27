import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { documentiPer, formatPrezzo } from "@/lib/documenti";

/**
 * I documenti camerali ordinabili, presentati come un listino: una riga per
 * documento, prezzo a destra in cifre incolonnate. Niente riquadri, niente
 * icona ripetuta accanto a ogni voce — non aggiungerebbe informazione.
 *
 * ⚠️ L'ordine NON è attivo: non c'è un fornitore collegato né un incasso, e i
 * prezzi sono segnaposto. I pulsanti sono disabilitati e l'avviso lo dice —
 * un pulsante d'acquisto che sembra funzionante ma non lo è sarebbe peggio di
 * nessun pulsante.
 */
export function DocumentiAcquistabili({ eSocieta }: { eSocieta: boolean }) {
  const documenti = documentiPer({ eSocieta });

  return (
    <section className="print:hidden">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">
        Documenti ufficiali
      </h2>

      <p className="border-warning/25 bg-warning-subtle/40 text-warning mb-4 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium">Ordine non ancora attivo.</strong> Il
          catalogo qui sotto è un&apos;anteprima: i prezzi sono indicativi e nessun
          acquisto è possibile in questo momento.
        </span>
      </p>

      <ul className="border-border divide-border bg-card shadow-card divide-y overflow-hidden rounded-xl border">
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

            <Button size="sm" variant="outline" disabled className="shrink-0">
              Ordina
            </Button>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-3 text-xs">
        Prezzi IVA esclusa. I documenti sono rilasciati dal Registro Imprese:
        Ufficio Camerale non emette atti con valore legale.
      </p>
    </section>
  );
}
