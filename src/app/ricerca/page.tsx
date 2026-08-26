import type { Metadata } from "next";
import { CircleAlert, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { SearchForm } from "@/components/search/search-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeQuery, QUERY_KIND_TEXT, searchQuerySchema } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Ricerca aziende",
  description:
    "Cerca un'azienda italiana per Partita IVA, codice fiscale o ragione sociale.",
};

export default async function RicercaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  // La stessa validazione della UI viene rieseguita lato server: il parametro
  // arriva dall'URL e non ci si può fidare di quanto ha fatto il client.
  const parsed = searchQuerySchema.safeParse(q ?? "");
  const analysis = parsed.success ? analyzeQuery(parsed.data) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ricerca aziende</h1>

      <div className="mt-6 max-w-2xl">
        <SearchForm
          defaultValue={parsed.success ? parsed.data : ""}
          size="compact"
        />
      </div>

      <div className="mt-8">
        {!analysis ? (
          <EmptyQuery
            message={parsed.success ? undefined : parsed.error.issues[0]?.message}
          />
        ) : !analysis.isValid ? (
          <InvalidQuery analysis={analysis} />
        ) : (
          <ValidQuery analysis={analysis} />
        )}
      </div>
    </div>
  );
}

function EmptyQuery({ message }: { message?: string }) {
  return (
    <Card className="shadow-card max-w-2xl">
      <CardContent className="text-muted-foreground text-sm">
        {message ??
          "Digita una Partita IVA, un codice fiscale o una ragione sociale."}
      </CardContent>
    </Card>
  );
}

function InvalidQuery({
  analysis,
}: {
  analysis: NonNullable<ReturnType<typeof analyzeQuery>>;
}) {
  return (
    <Card className="border-danger/25 bg-danger-subtle/40 shadow-card max-w-2xl">
      <CardHeader>
        <CardTitle className="text-danger flex items-center gap-2 text-base">
          <CircleAlert className="size-4" aria-hidden />
          {QUERY_KIND_TEXT[analysis.kind].invalidTitle}
        </CardTitle>
      </CardHeader>
      {/* Il messaggio puntuale è già sotto il campo di ricerca: qui si spiega
          soltanto che cosa significa. */}
      <CardContent className="text-muted-foreground text-sm">
        Hai cercato{" "}
        <span className="num text-foreground font-medium">{analysis.raw}</span>. Il
        controllo è puramente formale e avviene senza interrogare nessun servizio
        esterno: se la cifra di controllo non torna, il numero non può esistere.
      </CardContent>
    </Card>
  );
}

function ValidQuery({
  analysis,
}: {
  analysis: NonNullable<ReturnType<typeof analyzeQuery>>;
}) {
  // VIES verifica solo le partite IVA comunitarie, non i codici fiscali
  const isPartitaIva = analysis.kind === "partita-iva";

  return (
    <div className="space-y-4">
      <Card className="shadow-card max-w-2xl">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <ShieldCheck className="text-success size-4" aria-hidden />
            <span className="num">{analysis.value}</span>
            <Badge
              variant="outline"
              className="border-success/25 bg-success-subtle text-success"
            >
              {QUERY_KIND_TEXT[analysis.kind].label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {QUERY_KIND_TEXT[analysis.kind].meaning}
        </CardContent>
      </Card>

      <Card className="max-w-2xl border-dashed shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="text-muted-foreground size-4" aria-hidden />
            Risultati non ancora disponibili
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm">
          <p>
            Il collegamento alle fonti dati arriva agli step successivi: VIES per
            l&apos;esistenza europea della Partita IVA, il Registro Imprese per
            l&apos;anagrafica camerale completa.
          </p>
          {isPartitaIva && (
            <Button asChild variant="outline" size="sm">
              <Link href="/verifica-partita-iva">Verifica su VIES</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
