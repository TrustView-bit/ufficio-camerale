import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { LEGALE_INCOMPLETO, SITE } from "@/lib/site-config";
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

        {LEGALE_INCOMPLETO && (
          <p className="border-warning/25 bg-warning-subtle/40 text-warning mt-8 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-medium">Testo non ancora definitivo.</strong>{" "}
              Mancano i dati identificativi del titolare del trattamento e questi
              testi non sono stati esaminati da un legale. Vanno completati prima di
              pubblicare il servizio.
            </span>
          </p>
        )}

        <div className="prosa mt-10">{children}</div>
      </div>
    </div>
  );
}
