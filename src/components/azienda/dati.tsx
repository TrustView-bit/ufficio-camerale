import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Una riga "etichetta / valore" di una scheda. */
export function Dato({
  etichetta,
  children,
  numerico = false,
}: {
  etichetta: string;
  children: ReactNode;
  numerico?: boolean;
}) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{etichetta}</dt>
      <dd className={numerico ? "num text-sm font-medium" : "text-sm"}>
        {children}
      </dd>
    </div>
  );
}

/**
 * Blocco di dati camerali. Se non c'è nemmeno un campo valorizzato la scheda
 * non viene mostrata: una card piena di trattini non informa nessuno.
 */
export function SchedaDati({
  titolo,
  icona,
  children,
  vuota = false,
}: {
  titolo: string;
  icona?: ReactNode;
  children: ReactNode;
  vuota?: boolean;
}) {
  if (vuota) return null;

  return (
    <Card className="shadow-card break-inside-avoid">
      <CardHeader>
        {/* Un vero heading, non un div: la scheda è un documento strutturato
            e deve poter essere percorsa per titoli. */}
        <h2
          data-slot="card-title"
          className="font-heading flex items-center gap-2 text-base leading-snug font-medium"
        >
          {icona}
          {titolo}
        </h2>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3">{children}</dl>
      </CardContent>
    </Card>
  );
}
