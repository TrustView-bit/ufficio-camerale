import type { Metadata } from "next";
import {
  Briefcase,
  Building2,
  Contact,
  Landmark,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Dato, SchedaDati } from "@/components/azienda/dati";
import { FonteDati } from "@/components/azienda/fonte-dati";
import { QuickLinks } from "@/components/azienda/quick-links";
import { StatusBadge, type CompanyStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { descriviAteco } from "@/lib/ateco";
import { lookupCompany } from "@/lib/companies";
import {
  anniDi,
  formatDataIso,
  formatEuro,
  formatIndirizzo,
  hostnameDi,
  toSitoHref,
} from "@/lib/format";
import { env } from "@/lib/env";
import type { CompanyData } from "@/lib/providers/types";
import { buildAziendaSlug, parsePartitaIvaFromSlug } from "@/lib/slug";

/** Le schede si rigenerano al massimo una volta all'ora. */
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function caricaAzienda(slug: string) {
  const partitaIva = parsePartitaIvaFromSlug(slug);
  if (!partitaIva) return null;

  const result = await lookupCompany(partitaIva);
  return { partitaIva, result };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caricata = await caricaAzienda(slug);

  if (!caricata || caricata.result.status !== "found") {
    return { title: "Azienda non trovata", robots: { index: false } };
  }

  const { company } = caricata.result;
  const sede = company.sede?.comune;
  const descrizione = [
    `Dati camerali di ${company.denominazione}`,
    sede ? `con sede a ${sede}` : null,
    `— Partita IVA ${company.partitaIva}, numero REA, ATECO, PEC e contatti.`,
  ]
    .filter(Boolean)
    .join(" ");

  const url = `${env.NEXT_PUBLIC_SITE_URL}/azienda/${buildAziendaSlug(
    company.denominazione,
    company.partitaIva,
  )}`;

  return {
    title: company.denominazione,
    description: descrizione,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title: company.denominazione,
      description: descrizione,
      url,
      siteName: "Ufficio Camerale",
      locale: "it_IT",
    },
  };
}

export default async function AziendaPage({ params }: Props) {
  const { slug } = await params;
  const caricata = await caricaAzienda(slug);

  if (!caricata) notFound();

  const { result } = caricata;

  if (result.status === "not-found") notFound();

  if (result.status === "unavailable") {
    return <ServizioNonDisponibile />;
  }

  const { company, source, fetchedAt } = result;

  // Se si arriva da uno slug vecchio o storpiato si corregge l'indirizzo:
  // un solo URL canonico per azienda, che è anche ciò che vuole Google.
  const canonico = buildAziendaSlug(company.denominazione, company.partitaIva);
  if (slug !== canonico) permanentRedirect(`/azienda/${canonico}`);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(company)) }}
      />

      <Intestazione company={company} />

      <div className="mt-6">
        <QuickLinks company={company} />
      </div>

      <div className="mt-6">
        <FonteDati source={source} fetchedAt={fetchedAt} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Anagrafica company={company} />
        <Sede company={company} />
        <Attivita company={company} />
        <DatiCamerali company={company} />
        <Contatti company={company} />
      </div>
    </div>
  );
}

function Intestazione({ company }: { company: CompanyData }) {
  const stato = company.statoAttivita;

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {company.denominazione}
        </h1>
        {stato !== "sconosciuto" && <StatusBadge status={stato as CompanyStatus} />}
      </div>

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>
          Partita IVA{" "}
          <span className="num text-foreground">{company.partitaIva}</span>
        </span>
        {company.formaGiuridica && <span>· {company.formaGiuridica}</span>}
        {company.sede?.comune && <span>· {company.sede.comune}</span>}
      </p>
    </header>
  );
}

function Anagrafica({ company }: { company: CompanyData }) {
  const anni = anniDi(company.dataCostituzione);

  return (
    <SchedaDati
      titolo="Anagrafica"
      icona={<Building2 className="text-primary size-4" aria-hidden />}
    >
      <Dato etichetta="Denominazione">{company.denominazione}</Dato>
      <Dato etichetta="Partita IVA" numerico>
        {company.partitaIva}
      </Dato>
      {company.codiceFiscale && (
        <Dato etichetta="Codice fiscale" numerico>
          {company.codiceFiscale}
        </Dato>
      )}
      {company.formaGiuridica && (
        <Dato etichetta="Forma giuridica">{company.formaGiuridica}</Dato>
      )}
      {company.dataCostituzione && (
        <Dato etichetta="Costituita il">
          {formatDataIso(company.dataCostituzione)}
          {anni !== null && (
            <span className="text-muted-foreground">
              {" "}
              · {anni} anni di attività
            </span>
          )}
        </Dato>
      )}
      {company.dipendenti !== null && (
        <Dato etichetta="Dipendenti" numerico>
          {company.dipendenti}
          {company.classeDipendenti && (
            <span className="text-muted-foreground font-normal">
              {" "}
              (classe {company.classeDipendenti})
            </span>
          )}
        </Dato>
      )}
    </SchedaDati>
  );
}

function Sede({ company }: { company: CompanyData }) {
  const indirizzo = formatIndirizzo(company.sede);

  return (
    <SchedaDati
      titolo="Sede e unità locali"
      icona={<MapPin className="text-primary size-4" aria-hidden />}
      vuota={!indirizzo && company.unitaLocali.length === 0}
    >
      {indirizzo && <Dato etichetta="Sede legale">{indirizzo}</Dato>}

      {company.unitaLocali.map((unita, indice) => {
        const riga = formatIndirizzo(unita.indirizzo);
        return (
          <Dato
            key={`${unita.denominazione ?? "unita"}-${indice}`}
            etichetta={unita.denominazione ?? `Unità locale ${indice + 1}`}
          >
            {riga ?? "Indirizzo non disponibile"}
          </Dato>
        );
      })}
    </SchedaDati>
  );
}

function Attivita({ company }: { company: CompanyData }) {
  // La descrizione si risolve sui dataset Istat al momento di mostrarla: il
  // codice grezzo resta quello del fornitore, e resta visibile.
  const risolto = company.atecoPrimario
    ? descriviAteco(company.atecoPrimario, company.atecoVersione ?? undefined)
    : null;
  const descrizione = risolto?.descrizione ?? company.atecoPrimarioDescrizione;

  return (
    <SchedaDati
      titolo="Attività"
      icona={<Briefcase className="text-primary size-4" aria-hidden />}
      vuota={!company.atecoPrimario && company.atecoSecondari.length === 0}
    >
      {company.atecoPrimario && (
        <Dato etichetta="ATECO primario">
          <span className="num font-medium">{company.atecoPrimario}</span>
          {descrizione && (
            <span className="text-muted-foreground"> — {descrizione}</span>
          )}
          {risolto && !risolto.esatta && (
            <span className="text-muted-foreground mt-1 block text-xs">
              Descrizione del livello superiore ({risolto.codice}): la
              corrispondenza con la classificazione ATECO 2025 non è univoca.
            </span>
          )}
          {risolto?.versioneRisolta === "2022" && (
            <span className="text-muted-foreground mt-1 block text-xs">
              Codice espresso in ATECO 2022, tradotto sulla classificazione 2025 in
              vigore.
            </span>
          )}
        </Dato>
      )}

      {company.atecoSecondari.map((ateco) => {
        const secondario = descriviAteco(
          ateco.codice,
          company.atecoVersione ?? undefined,
        );
        return (
          <Dato key={ateco.codice} etichetta="ATECO secondario">
            <span className="num font-medium">{ateco.codice}</span>
            {(secondario?.descrizione ?? ateco.descrizione) && (
              <span className="text-muted-foreground">
                {" "}
                — {secondario?.descrizione ?? ateco.descrizione}
              </span>
            )}
          </Dato>
        );
      })}
    </SchedaDati>
  );
}

function DatiCamerali({ company }: { company: CompanyData }) {
  const capitale = formatEuro(company.capitaleSociale);

  return (
    <SchedaDati
      titolo="Dati camerali"
      icona={<Landmark className="text-primary size-4" aria-hidden />}
      vuota={!company.reaNumero && !capitale && company.bilanci.length === 0}
    >
      {company.reaNumero && (
        <Dato etichetta="Numero REA" numerico>
          {company.reaCciaa
            ? `${company.reaCciaa}-${company.reaNumero}`
            : company.reaNumero}
        </Dato>
      )}
      {company.reaCciaa && <Dato etichetta="CCIAA">{company.reaCciaa}</Dato>}
      {capitale && (
        <Dato etichetta="Capitale sociale" numerico>
          {capitale}
        </Dato>
      )}
      {company.bilanci.map((bilancio) => (
        <Dato key={bilancio.anno} etichetta={`Fatturato ${bilancio.anno}`} numerico>
          {formatEuro(bilancio.fatturato) ?? "non disponibile"}
        </Dato>
      ))}
    </SchedaDati>
  );
}

function Contatti({ company }: { company: CompanyData }) {
  const sito = toSitoHref(company.sitoWeb);

  return (
    <SchedaDati
      titolo="Contatti"
      icona={<Contact className="text-primary size-4" aria-hidden />}
      vuota={!company.pec && !sito && !company.telefono}
    >
      {company.pec && (
        <Dato etichetta="PEC">
          <a
            className="text-primary hover:underline"
            href={`mailto:${company.pec}`}
          >
            {company.pec}
          </a>
        </Dato>
      )}
      {sito && (
        <Dato etichetta="Sito web">
          <a
            className="text-primary hover:underline"
            href={sito}
            target="_blank"
            rel="noopener noreferrer"
          >
            {hostnameDi(company.sitoWeb)}
          </a>
        </Dato>
      )}
      {company.telefono && (
        <Dato etichetta="Telefono" numerico>
          {company.telefono}
        </Dato>
      )}
    </SchedaDati>
  );
}

function ServizioNonDisponibile() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Card className="border-warning/25 bg-warning-subtle/40 shadow-card max-w-2xl">
        <CardContent className="flex flex-col items-start gap-4">
          <TriangleAlert className="text-warning size-6" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">
            Dati camerali momentaneamente irraggiungibili
          </h1>
          <p className="text-muted-foreground">
            Non riusciamo a contattare il Registro Imprese e di questa azienda non
            abbiamo ancora una copia in archivio. Non significa che l&apos;impresa
            non esista: riprova fra qualche minuto.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Torna alla ricerca</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Dati strutturati per i motori di ricerca. */
function jsonLd(company: CompanyData) {
  const sito = toSitoHref(company.sitoWeb);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.denominazione,
    vatID: `IT${company.partitaIva}`,
    taxID: company.codiceFiscale ?? undefined,
    url: sito ?? undefined,
    email: company.pec ?? undefined,
    telephone: company.telefono ?? undefined,
    foundingDate: company.dataCostituzione ?? undefined,
    numberOfEmployees:
      company.dipendenti === null
        ? undefined
        : { "@type": "QuantitativeValue", value: company.dipendenti },
    address: company.sede
      ? {
          "@type": "PostalAddress",
          streetAddress: company.sede.via ?? undefined,
          postalCode: company.sede.cap ?? undefined,
          addressLocality: company.sede.comune ?? undefined,
          addressRegion: company.sede.provincia ?? undefined,
          addressCountry: company.sede.nazione ?? "IT",
        }
      : undefined,
  };
}
