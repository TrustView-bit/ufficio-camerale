import Link from "next/link";

import { SchedaAzienda } from "@/components/elenco/scheda-azienda";
import type { RisultatoAzienda } from "@/lib/providers/types";

/**
 * Altre aziende dello stesso comune o dello stesso settore.
 *
 * Senza questi collegamenti una scheda è un vicolo cieco: ci si arriva da un
 * motore di ricerca e non si va da nessuna parte.
 */
export function AziendeSimili({
  titolo,
  aziende,
  vediTutte,
}: {
  titolo: string;
  aziende: RisultatoAzienda[];
  vediTutte?: { href: string; testo: string };
}) {
  if (aziende.length === 0) return null;

  return (
    <section className="print:hidden">
      <div className="border-foreground mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b-2 pb-1.5">
        <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
          {titolo}
        </h2>
        {vediTutte && (
          <Link
            href={vediTutte.href}
            className="text-primary ease-ui text-sm transition-colors duration-150 hover:underline"
          >
            {vediTutte.testo}
          </Link>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {aziende.map((azienda) => (
          <li key={azienda.partitaIva}>
            <SchedaAzienda azienda={azienda} />
          </li>
        ))}
      </ul>
    </section>
  );
}
