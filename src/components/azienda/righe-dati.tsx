import type { ReactNode } from "react";

/**
 * Tabella di dati anagrafici: etichetta a sinistra su fondo tenue, valore a
 * destra, righe separate da un filo. Spigoli vivi, nessuna ombra — è una
 * tabella di un registro, non una scheda di un'applicazione.
 *
 * Le righe senza valore non vengono generate affatto, così non restano
 * trattini a riempire lo spazio.
 */

export type Riga = {
  etichetta: string;
  valore: ReactNode;
  /** Numeri incolonnati: P.IVA, REA, capitale. */
  numerico?: boolean;
  /** Azione mostrata in fondo alla riga. */
  azione?: ReactNode;
};

/** Le righe si scrivono con `campo && { ... }`: tutto ciò che non è una riga
    — null, false, stringa vuota — semplicemente non compare. */
export type RigaOpzionale = Riga | null | false | undefined | "";

export function BoxDati({
  titolo,
  righe,
  children,
}: {
  titolo?: string;
  righe: RigaOpzionale[];
  children?: ReactNode;
}) {
  const visibili = righe.filter((riga): riga is Riga => Boolean(riga));
  if (visibili.length === 0 && !children) return null;

  return (
    <section className="break-inside-avoid">
      {titolo && (
        <h2 className="border-foreground mb-0 border-b-2 pb-1.5 text-sm font-semibold tracking-[0.08em] uppercase">
          {titolo}
        </h2>
      )}

      <table className="border-border w-full border-x border-b text-sm">
        <tbody>
          {visibili.map((riga, indice) => (
            <tr
              // l'etichetta si ripete: un'impresa può avere più ATECO secondari
              key={`${indice}-${riga.etichetta}`}
              className="border-border border-b last:border-b-0"
            >
              <th
                scope="row"
                className="bg-muted/60 border-border text-muted-foreground w-[38%] border-r px-3 py-2.5 text-left align-top font-normal sm:w-[34%] sm:px-4"
              >
                {riga.etichetta}
              </th>
              <td className="px-3 py-2.5 align-top sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span
                    className={
                      riga.numerico
                        ? "num text-foreground font-semibold"
                        : "text-foreground font-semibold"
                    }
                  >
                    {riga.valore}
                  </span>
                  {riga.azione}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {children}
    </section>
  );
}
