import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AziendaNonTrovata() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Card className="shadow-card max-w-2xl">
        <CardContent className="flex flex-col items-start gap-4">
          <SearchX className="text-muted-foreground size-6" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">
            Nessuna impresa con questa Partita IVA
          </h1>
          <p className="text-muted-foreground">
            Il numero è formalmente corretto, ma nel Registro Imprese non risulta
            alcuna impresa associata. Può non essere mai stato assegnato, oppure
            appartenere a un soggetto che non è un&apos;impresa — un professionista,
            un ente.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/">Cerca un&apos;altra azienda</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/verifica-partita-iva">Verifica su VIES</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
