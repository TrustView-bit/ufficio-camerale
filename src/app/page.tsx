import { ArrowRight, Building2, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ESEMPI = ["00743110157", "Ferrari S.p.A.", "01234567890"] as const;

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="py-16 sm:py-24">
        <Badge
          variant="outline"
          className="border-accent/30 bg-accent/10 text-accent mb-6 h-7 gap-1.5 px-3"
        >
          <ShieldCheck className="size-3" aria-hidden />
          Dati pubblici del Registro Imprese e VIES
        </Badge>

        <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Verifica una Partita IVA,
          <br className="hidden sm:block" /> consulta l&apos;azienda dietro il
          numero.
        </h1>

        <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-relaxed">
          Inserisci una Partita IVA, un codice fiscale o una ragione sociale.
          Riconosciamo automaticamente cosa hai digitato e ti mostriamo la scheda
          camerale completa.
        </p>

        {/* Shell della ricerca: la logica arriva allo step 2 */}
        <div className="mt-9 max-w-2xl">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                type="search"
                disabled
                placeholder="P.IVA, codice fiscale o ragione sociale"
                aria-label="Cerca un'azienda"
                className="num shadow-card h-13 pl-11 text-base"
              />
            </div>
            <Button size="lg" disabled className="h-13 px-7 text-base">
              Cerca
              <ArrowRight aria-hidden />
            </Button>
          </div>

          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span>Prova con:</span>
            {ESEMPI.map((esempio) => (
              <span
                key={esempio}
                className="num border-border bg-card text-foreground rounded-md border px-2.5 py-1 text-xs"
              >
                {esempio}
              </span>
            ))}
          </div>

          <p className="border-warning/25 bg-warning-subtle text-warning mt-6 rounded-lg border px-4 py-3 text-sm">
            Step 1 completato: impalcatura, design token e layout. La ricerca si
            attiva allo step 2.
          </p>
        </div>
      </section>

      {/* Anteprima dei token: stati camerali e densità delle card */}
      <section className="pb-8" aria-labelledby="anteprima">
        <h2
          id="anteprima"
          className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
        >
          Anteprima del sistema visivo
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="text-primary size-4" aria-hidden />
                Stati attività
              </CardTitle>
              <CardDescription>
                Ambra e rosso solo per stati reali, mai decorativi.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <StatusBadge status="attiva" />
              <StatusBadge status="in-liquidazione" />
              <StatusBadge status="cessata" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Numeri tabulari</CardTitle>
              <CardDescription>
                P.IVA, REA e capitale restano incolonnati.
              </CardDescription>
            </CardHeader>
            <CardContent className="num space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">P.IVA</span>
                <span>00743110157</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">REA</span>
                <span>MI-1305487</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Capitale</span>
                <span>10.000,00 €</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Strumento VIES</CardTitle>
              <CardDescription>
                Validazione formale ed europea della Partita IVA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/verifica-partita-iva">
                  Vai allo strumento
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
