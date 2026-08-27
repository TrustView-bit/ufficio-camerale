import Link from "next/link";

export type Collegamento = { nome: string; href: string; quante: number };

/**
 * Griglia di collegamenti al livello successivo — regioni, province, comuni —
 * con il numero di aziende. È ciò che rende l'archivio percorribile invece
 * che raggiungibile solo per ricerca.
 */
export function GrigliaCollegamenti({
  titolo,
  voci,
}: {
  titolo: string;
  voci: Collegamento[];
}) {
  if (voci.length === 0) return null;

  return (
    <section>
      <h2 className="border-foreground mb-4 border-b-2 pb-1.5 text-sm font-semibold tracking-[0.08em] uppercase">
        {titolo}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {voci.map((voce) => (
          <li key={voce.href}>
            <Link
              href={voce.href}
              className="border-border bg-card ease-ui hover:border-primary flex items-baseline justify-between gap-3 border px-3 py-2 text-sm transition-colors duration-150"
            >
              <span>{voce.nome}</span>
              <span className="num text-muted-foreground text-xs">
                {voce.quante}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
