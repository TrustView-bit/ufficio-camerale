import Link from "next/link";

import { StatusBadge, type CompanyStatus } from "@/components/status-badge";
import { formatEuroCompatto } from "@/lib/format";
import type { AziendaInEvidenza } from "@/lib/providers/types";
import { buildAziendaSlug } from "@/lib/slug";

/**
 * Schede rapide delle aziende più grandi dell'archivio.
 *
 * Servono a due cose: dare alla home un ingresso che non sia solo il campo di
 * ricerca — chi arriva senza una Partita IVA in mano ha comunque qualcosa da
 * aprire — e mostrare subito che tipo di scheda il sito produce.
 *
 * L'ordinamento è per ultimo fatturato noto, quindi è una classifica
 * dell'**archivio**, non delle imprese italiane: il titolo lo dice, perché
 * lasciar credere il contrario significherebbe attribuire ai numeri una
 * completezza che non hanno.
 */
export function AziendeInEvidenza({ aziende }: { aziende: AziendaInEvidenza[] }) {
  if (aziende.length === 0) return null;

  return (
    <section aria-labelledby="in-evidenza" className="pb-12">
      <div className="border-foreground mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b-2 pb-1.5">
        <h2
          id="in-evidenza"
          className="text-sm font-semibold tracking-[0.08em] uppercase"
        >
          Tra le maggiori in archivio
        </h2>
        <Link
          href="/aziende"
          className="text-primary ease-ui text-sm transition-colors duration-150 hover:underline"
        >
          Sfoglia tutte le aziende
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {aziende.map((azienda) => (
          <li key={azienda.partitaIva}>
            <SchedaEvidenza azienda={azienda} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SchedaEvidenza({ azienda }: { azienda: AziendaInEvidenza }) {
  const luogo = [azienda.comune, azienda.provincia && `(${azienda.provincia})`]
    .filter(Boolean)
    .join(" ");

  const fatturato = formatEuroCompatto(azienda.fatturato);

  return (
    <Link
      href={`/azienda/${buildAziendaSlug(azienda.denominazione, azienda.partitaIva)}`}
      className="border-border bg-card ease-ui hover:border-primary flex h-full flex-col gap-2 border p-4 transition-colors duration-150"
    >
      <h3 className="text-sm leading-snug font-semibold text-balance">
        {azienda.denominazione}
      </h3>

      <p className="num text-muted-foreground text-xs">{azienda.partitaIva}</p>

      {fatturato && (
        <p className="mt-1">
          <span className="num block text-lg leading-none font-semibold">
            {fatturato}
          </span>
          <span className="text-muted-foreground text-xs">
            {azienda.anno ? `Ricavi ${azienda.anno}` : "Ricavi"}
          </span>
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {luogo && <span className="text-muted-foreground text-xs">{luogo}</span>}
        {azienda.statoAttivita !== "sconosciuto" && (
          <StatusBadge status={azienda.statoAttivita as CompanyStatus} />
        )}
      </div>
    </Link>
  );
}
