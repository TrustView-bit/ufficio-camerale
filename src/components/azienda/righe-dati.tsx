import type { ReactNode } from "react";

/**
 * Elenco di dati a righe, come nelle visure: etichetta a sinistra, valore in
 * evidenza. Le righe senza valore non vengono generate affatto, così non
 * restano trattini a riempire lo spazio.
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
        <h2 className="mb-3 text-lg font-semibold tracking-tight">{titolo}</h2>
      )}

      <div className="border-border bg-card shadow-card divide-border divide-y overflow-hidden rounded-xl border">
        {visibili.map((riga) => (
          <div
            key={riga.etichetta}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
          >
            <p className="text-sm">
              <span className="text-muted-foreground">{riga.etichetta}: </span>
              <span
                className={
                  riga.numerico
                    ? "num text-foreground font-semibold"
                    : "text-foreground font-semibold"
                }
              >
                {riga.valore}
              </span>
            </p>
            {riga.azione}
          </div>
        ))}
        {children}
      </div>
    </section>
  );
}
