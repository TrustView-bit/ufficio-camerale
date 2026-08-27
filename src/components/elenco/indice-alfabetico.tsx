import Link from "next/link";

/** A–Z più il gruppo "#" per le denominazioni che iniziano con una cifra. */
export const LETTERE = [
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  "#",
];

/**
 * Indice alfabetico. Le lettere senza aziende restano visibili ma spente:
 * nasconderle farebbe saltare l'alfabeto e costringerebbe a cercare la
 * lettera invece di puntarla.
 */
export function IndiceAlfabetico({
  conteggi,
  attiva,
}: {
  conteggi: Map<string, number>;
  attiva?: string;
}) {
  return (
    <nav aria-label="Indice alfabetico" className="flex flex-wrap gap-1.5">
      {LETTERE.map((lettera) => {
        const quante = conteggi.get(lettera) ?? 0;
        const selezionata = attiva === lettera;

        if (quante === 0) {
          return (
            <span
              key={lettera}
              aria-disabled
              title={`Nessuna azienda con la ${lettera}`}
              className="border-border text-muted-foreground/40 num flex size-8 items-center justify-center rounded-none border text-sm"
            >
              {lettera}
            </span>
          );
        }

        return (
          <Link
            key={lettera}
            href={`/aziende/lettera/${lettera === "#" ? "0-9" : lettera.toLowerCase()}`}
            aria-current={selezionata ? "true" : undefined}
            title={`${quante} ${quante === 1 ? "azienda" : "aziende"}`}
            className={`num ease-ui flex size-8 items-center justify-center rounded-none border text-sm transition-colors duration-150 ${
              selezionata
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {lettera}
          </Link>
        );
      })}
    </nav>
  );
}
