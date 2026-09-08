import type { ReactNode } from "react";

import { SITE } from "@/lib/site-config";
import { formatDataIso } from "@/lib/format";

/** Impaginazione comune a informativa, termini, cookie e chi siamo. */
export function PaginaLegale({
  titolo,
  sommario,
  children,
}: {
  titolo: string;
  sommario: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {titolo}
        </h1>
        <p className="text-muted-foreground mt-4 leading-relaxed">{sommario}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Ultimo aggiornamento: {formatDataIso(SITE.ultimoAggiornamentoLegale)}
        </p>

        <div className="prosa mt-10">{children}</div>
      </div>
    </div>
  );
}
