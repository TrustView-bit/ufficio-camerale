import { cn } from "@/lib/utils";

/** Stato attività di un'impresa nel Registro Imprese. */
export type CompanyStatus = "attiva" | "inattiva" | "cessata" | "in-liquidazione";

/**
 * Lo stato attività, scritto come su un registro: un piccolo quadro colorato
 * e la parola in maiuscoletto. Niente pillola, niente fondo colorato — sono
 * dati anagrafici, non notifiche di un'applicazione.
 *
 * Il colore non è mai l'unica informazione: la parola c'è sempre.
 */
const STATO: Record<CompanyStatus, { label: string; classe: string }> = {
  attiva: { label: "Attiva", classe: "text-success" },
  inattiva: { label: "Inattiva", classe: "text-muted-foreground" },
  "in-liquidazione": { label: "In liquidazione", classe: "text-warning" },
  cessata: { label: "Cessata", classe: "text-danger" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CompanyStatus;
  className?: string;
}) {
  const { label, classe } = STATO[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.06em] uppercase",
        classe,
        className,
      )}
    >
      <span className="size-1.5 shrink-0 bg-current" aria-hidden />
      {label}
    </span>
  );
}
