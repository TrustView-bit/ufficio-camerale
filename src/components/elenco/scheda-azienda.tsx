import { Building2, FlaskConical } from "lucide-react";
import Link from "next/link";

import { StatusBadge, type CompanyStatus } from "@/components/status-badge";
import type { RisultatoAzienda } from "@/lib/providers/types";
import { buildAziendaSlug } from "@/lib/slug";

/** Riquadro cliccabile di un'azienda, usato in tutti gli elenchi. */
export function SchedaAzienda({ azienda }: { azienda: RisultatoAzienda }) {
  const luogo = [azienda.comune, azienda.provincia && `(${azienda.provincia})`]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={`/azienda/${buildAziendaSlug(azienda.denominazione, azienda.partitaIva)}`}
      className="border-border bg-card shadow-card ease-ui hover:border-primary/40 flex h-full flex-col gap-2 rounded-xl border p-4 transition-colors duration-150"
    >
      <div className="flex items-start gap-2">
        <Building2 className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
        <h3 className="text-sm leading-snug font-semibold text-balance">
          {azienda.denominazione}
        </h3>
      </div>

      <p className="num text-muted-foreground text-xs">{azienda.partitaIva}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {luogo && <span className="text-muted-foreground text-xs">{luogo}</span>}
        {azienda.statoAttivita !== "sconosciuto" && (
          <StatusBadge status={azienda.statoAttivita as CompanyStatus} />
        )}
        {azienda.fittizia && (
          <span
            className="border-warning/25 bg-warning-subtle text-warning inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
            title="Azienda del dataset dimostrativo: dati inventati"
          >
            <FlaskConical className="size-2.5" aria-hidden />
            esempio
          </span>
        )}
      </div>
    </Link>
  );
}
