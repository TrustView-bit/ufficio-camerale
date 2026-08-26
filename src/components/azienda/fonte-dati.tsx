import { Clock, Database, RefreshCw } from "lucide-react";

import { formatDataOra } from "@/lib/format";
import type { CompanySource } from "@/lib/companies/repository";

/**
 * Dice all'utente quanto è vecchio il dato che sta leggendo. Serve soprattutto
 * quando il fornitore non risponde e mostriamo l'ultima copia in archivio:
 * un dato datato va dichiarato tale, non spacciato per fresco.
 */
export function FonteDati({
  source,
  fetchedAt,
}: {
  source: CompanySource;
  fetchedAt: Date;
}) {
  const quando = formatDataOra(fetchedAt);

  if (source === "database-stale") {
    return (
      <p className="border-warning/25 bg-warning-subtle/40 text-warning flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Il Registro Imprese non risponde in questo momento: stai vedendo i dati
          salvati il {quando}. Potrebbero non essere più aggiornati.
        </span>
      </p>
    );
  }

  const Icona = source === "provider" ? RefreshCw : Database;
  const testo =
    source === "provider"
      ? `Dati aggiornati oggi dal Registro Imprese.`
      : `Dati aggiornati al ${quando}.`;

  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <Icona className="size-3.5 shrink-0" aria-hidden />
      {testo}
    </p>
  );
}
