import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { env } from "@/lib/env";

export type Bricola = { nome: string; href?: string };

/**
 * Briciole di navigazione. Oltre a orientare chi legge, sono dati strutturati
 * per i motori di ricerca: dicono dove sta la pagina nella gerarchia del sito.
 */
export function Briciole({ voci }: { voci: Bricola[] }) {
  const complete: Bricola[] = [{ nome: "Aziende", href: "/aziende" }, ...voci];

  const datiStrutturati = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: complete.map((voce, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: voce.nome,
      item: voce.href ? `${env.NEXT_PUBLIC_SITE_URL}${voce.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati) }}
      />
      <nav aria-label="Percorso" className="print:hidden">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
          {complete.map((voce, indice) => (
            // il nome non basta come chiave: capoluogo e provincia si chiamano
            // spesso allo stesso modo, "Bari" dentro "Bari"
            <li key={`${indice}-${voce.nome}`} className="flex items-center gap-1">
              {indice > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 opacity-50"
                  aria-hidden
                />
              )}
              {voce.href ? (
                <Link
                  href={voce.href}
                  className="ease-ui hover:text-foreground rounded transition-colors duration-150"
                >
                  {voce.nome}
                </Link>
              ) : (
                <span className="text-foreground">{voce.nome}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
