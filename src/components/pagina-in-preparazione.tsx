import { Construction } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Segnaposto per le sezioni già raggiungibili dalla navigazione ma non
 * ancora implementate: meglio una pagina onesta che un link rotto.
 */
export function PaginaInPreparazione({
  titolo,
  descrizione,
}: {
  titolo: string;
  descrizione: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
        <Construction className="size-5" aria-hidden />
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">{titolo}</h1>
      <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
        {descrizione}
      </p>
      <Button asChild variant="outline" className="mt-7">
        <Link href="/">Torna alla ricerca</Link>
      </Button>
    </div>
  );
}
