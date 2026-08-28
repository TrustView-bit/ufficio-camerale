/**
 * La sintesi in prosa dei dati della scheda.
 *
 * Dichiarata come generata automaticamente, e collocata sotto i dati e non
 * sopra: i dati sono la fonte, questa ne è una riscrittura. Chi legge deve
 * poter risalire a ogni affermazione guardando le righe qui accanto.
 */
export function Descrizione({ testo }: { testo: string | null }) {
  if (!testo) return null;

  return (
    <section className="print:break-inside-avoid">
      <h2 className="border-foreground mb-3 border-b-2 pb-1.5 text-sm font-semibold tracking-[0.08em] uppercase">
        In sintesi
      </h2>

      <p className="text-sm leading-relaxed">{testo}</p>

      <p className="text-muted-foreground mt-3 text-xs">
        Sintesi generata automaticamente a partire dai dati di questa scheda. Non
        aggiunge informazioni di altra provenienza; in caso di dubbio fanno fede i
        dati qui sopra.
      </p>
    </section>
  );
}
