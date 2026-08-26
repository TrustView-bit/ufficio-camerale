import { FileText, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { documentiPer, formatPrezzo } from "@/lib/documenti";

/**
 * Documenti camerali ordinabili.
 *
 * ⚠️ L'ordine NON è attivo: non c'è un fornitore collegato né un incasso, e i
 * prezzi sono segnaposto. I pulsanti sono disabilitati e l'avviso in cima lo
 * dice esplicitamente — un pulsante d'acquisto che sembra funzionante ma non
 * lo è sarebbe peggio di nessun pulsante.
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

      <ul className="grid gap-3 sm:grid-cols-2">
        {documenti.map((documento) => (
          <li
            key={documento.id}
            className="border-border bg-card shadow-card flex flex-col gap-3 rounded-xl border p-4"
          >
            <div className="flex items-start gap-2.5">
              <FileText
                className="text-primary mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              <div>
                <h3 className="text-sm font-semibold">{documento.nome}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {documento.descrizione}
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3">
              <span className="num text-base font-semibold">
                {formatPrezzo(documento.prezzo)}
              </span>
              <Button size="sm" variant="outline" disabled>
                Ordina
              </Button>
            </div>
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
