import type { Metadata } from "next";
import { CircleAlert, SearchX } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SchedaAzienda } from "@/components/elenco/scheda-azienda";
import { SearchForm } from "@/components/search/search-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cercaAziende } from "@/lib/companies";
import type { EsitoRicerca } from "@/lib/providers/types";
import { analyzeQuery, QUERY_KIND_TEXT } from "@/lib/validation";

/** Quante schede per pagina. */
const PER_PAGINA = 20;

export const metadata: Metadata = {
  title: "Ricerca aziende",
  description:
    "Cerca un'azienda italiana per Partita IVA, codice fiscale o ragione sociale.",
};

type Props = {
  searchParams: Promise<{ q?: string; provincia?: string; pagina?: string }>;
};

export default async function RicercaPage({ searchParams }: Props) {
  const parametri = await searchParams;
  const query = (parametri.q ?? "").trim().slice(0, 120);
  const provincia = parametri.provincia?.trim().toUpperCase().slice(0, 2);
  const pagina = Math.max(1, Number(parametri.pagina) || 1);

  const analisi = query ? analyzeQuery(query) : null;

  // Una Partita IVA valida identifica una sola impresa: si va dritti alla scheda
  if (analisi?.kind === "partita-iva" && analisi.isValid) {
    redirect(`/azienda/${analisi.value}`);
  }

  const numeroNonValido =
    analisi && analisi.kind !== "denominazione" && !analisi.isValid;

  const esito = numeroNonValido
    ? null
    : await cercaAziende(query, {
        provincia,
        offset: (pagina - 1) * PER_PAGINA,
        limite: PER_PAGINA,
      });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ricerca aziende</h1>

      <div className="mt-6 max-w-2xl">
        <SearchForm defaultValue={query} size="compact" />
      </div>

      <div className="mt-8">
        {numeroNonValido ? (
          <NumeroNonValido analisi={analisi} />
        ) : esito === null ? (
          <RicercaNonDisponibile />
        ) : (
          <Risultati
            esito={esito}
            query={query}
            provincia={provincia}
            pagina={pagina}
          />
        )}
      </div>
    </div>
  );
}

function NumeroNonValido({
  analisi,
}: {
  analisi: NonNullable<ReturnType<typeof analyzeQuery>>;
}) {
  return (
    <Card className="border-danger/25 bg-danger-subtle/40 shadow-card max-w-2xl">
      <CardHeader>
        <h2
          data-slot="card-title"
          className="text-danger font-heading flex items-center gap-2 text-base leading-snug font-medium"
        >
          <CircleAlert className="size-4" aria-hidden />
          {QUERY_KIND_TEXT[analisi.kind].invalidTitle}
        </h2>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Hai cercato{" "}
        <span className="num text-foreground font-medium">{analisi.raw}</span>. Il
        controllo è puramente formale e avviene senza interrogare nessun servizio
        esterno: se la cifra di controllo non torna, il numero non può esistere.
      </CardContent>
    </Card>
  );
}

function RicercaNonDisponibile() {
  return (
    <Card className="shadow-card max-w-2xl">
      <CardContent className="text-muted-foreground text-sm">
        Il fornitore di dati configurato non offre la ricerca per ragione sociale.
        Puoi comunque aprire la scheda di un&apos;azienda cercandone la Partita IVA.
      </CardContent>
    </Card>
  );
}

function Risultati({
  esito,
  query,
  provincia,
  pagina,
}: {
  esito: EsitoRicerca;
  query: string;
  provincia?: string;
  pagina: number;
}) {
  const pagine = Math.max(1, Math.ceil(esito.totale / PER_PAGINA));

  if (esito.totale === 0) {
    return (
      <Card className="shadow-card max-w-2xl">
        <CardHeader>
          <h2
            data-slot="card-title"
            className="font-heading flex items-center gap-2 text-base leading-snug font-medium"
          >
            <SearchX className="text-muted-foreground size-4" aria-hidden />
            Nessuna azienda trovata
          </h2>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Nessuna azienda corrisponde a{" "}
          <span className="text-foreground font-medium">{query}</span>. Prova con
          meno parole, o cerca direttamente la Partita IVA.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <span className="num text-foreground font-medium">{esito.totale}</span>{" "}
          {esito.totale === 1 ? "azienda trovata" : "aziende trovate"}
          {query && (
            <>
              {" "}
              per <span className="text-foreground font-medium">{query}</span>
            </>
          )}
        </p>
        {pagine > 1 && (
          <p className="text-muted-foreground num text-sm">
            Pagina {pagina} di {pagine}
          </p>
        )}
      </div>

      <FiltroProvince esito={esito} query={query} attiva={provincia} />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {esito.risultati.map((azienda) => (
          <li key={azienda.partitaIva}>
            <SchedaAzienda azienda={azienda} />
          </li>
        ))}
      </ul>

      <Paginazione
        pagina={pagina}
        pagine={pagine}
        query={query}
        provincia={provincia}
      />
    </div>
  );
}

function FiltroProvince({
  esito,
  query,
  attiva,
}: {
  esito: EsitoRicerca;
  query: string;
  attiva?: string;
}) {
  if (esito.province.length < 2) return null;

  const indirizzo = (provincia?: string) => {
    const parametri = new URLSearchParams();
    if (query) parametri.set("q", query);
    if (provincia) parametri.set("provincia", provincia);
    const stringa = parametri.toString();
    return stringa ? `/ricerca?${stringa}` : "/ricerca";
  };

  return (
    <nav aria-label="Filtra per provincia" className="flex flex-wrap gap-2">
      <Link
        href={indirizzo()}
        aria-current={attiva ? undefined : "true"}
        className={`ease-ui rounded-md border px-2.5 py-1 text-xs transition-colors duration-150 ${
          attiva
            ? "border-border bg-card text-muted-foreground hover:border-primary/40"
            : "border-primary bg-primary text-primary-foreground"
        }`}
      >
        Tutte
      </Link>

      {esito.province.slice(0, 14).map((provincia) => {
        const selezionata = attiva === provincia.sigla;
        return (
          <Link
            key={provincia.sigla}
            href={indirizzo(provincia.sigla)}
            aria-current={selezionata ? "true" : undefined}
            className={`ease-ui rounded-md border px-2.5 py-1 text-xs transition-colors duration-150 ${
              selezionata
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {provincia.sigla}{" "}
            <span className="num opacity-70">{provincia.quante}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Paginazione({
  pagina,
  pagine,
  query,
  provincia,
}: {
  pagina: number;
  pagine: number;
  query: string;
  provincia?: string;
}) {
  if (pagine < 2) return null;

  const indirizzo = (numero: number) => {
    const parametri = new URLSearchParams();
    if (query) parametri.set("q", query);
    if (provincia) parametri.set("provincia", provincia);
    if (numero > 1) parametri.set("pagina", String(numero));
    const stringa = parametri.toString();
    return stringa ? `/ricerca?${stringa}` : "/ricerca";
  };

  const stile =
    "border-border bg-card ease-ui hover:border-primary/40 rounded-md border px-3 py-1.5 text-sm transition-colors duration-150";

  return (
    <nav aria-label="Pagine dei risultati" className="flex items-center gap-2">
      {pagina > 1 ? (
        <Link href={indirizzo(pagina - 1)} className={stile} rel="prev">
          Precedente
        </Link>
      ) : (
        <span className={`${stile} text-muted-foreground opacity-50`}>
          Precedente
        </span>
      )}

      {pagina < pagine ? (
        <Link href={indirizzo(pagina + 1)} className={stile} rel="next">
          Successiva
        </Link>
      ) : (
        <span className={`${stile} text-muted-foreground opacity-50`}>
          Successiva
        </span>
      )}
    </nav>
  );
}
