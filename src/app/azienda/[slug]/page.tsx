import type { Metadata } from "next";
import { FlaskConical, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { after } from "next/server";

import { AndamentoFatturato } from "@/components/azienda/andamento-fatturato";
import { AziendeSimili } from "@/components/azienda/aziende-simili";
import { Descrizione } from "@/components/azienda/descrizione";
import { DocumentiAcquistabili } from "@/components/azienda/documenti-acquistabili";
import { FonteDati } from "@/components/azienda/fonte-dati";
import { MappaStatica } from "@/components/azienda/mappa-statica";
import { QuickLinks } from "@/components/azienda/quick-links";
import { SchedaParziale } from "@/components/azienda/scheda-parziale";
import { Briciole } from "@/components/elenco/briciole";
import {
  BoxDati,
  type Riga,
  type RigaOpzionale,
} from "@/components/azienda/righe-dati";
import { StatusBadge, type CompanyStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { descriviAteco, slugAteco } from "@/lib/ateco";
import { elencoAziende, lookupCompany } from "@/lib/companies";
import { descrizioneSalvata, generaESalva } from "@/lib/descrizioni";
import { env } from "@/lib/env";
import {
  anniDi,
  formatDataIso,
  formatEuro,
  formatIndirizzo,
  hostnameDi,
  mascheraCodiceFiscale,
  toSitoHref,
} from "@/lib/format";
import {
  normalizzaComune,
  regioneDiSigla,
  siglaToProvincia,
  slugTerritorio,
} from "@/lib/geo";
import type { CompanyData } from "@/lib/providers/types";
import { schedaIndicizzabile } from "@/lib/scheda";
import { ROBOTS_SE_DIMOSTRATIVO } from "@/lib/seo";
import { buildAziendaSlug, parsePartitaIvaFromSlug } from "@/lib/slug";

/** Le schede si rigenerano al massimo una volta all'ora. */
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function caricaAzienda(slug: string) {
  const partitaIva = parsePartitaIvaFromSlug(slug);
  if (!partitaIva) return null;

  return { partitaIva, result: await lookupCompany(partitaIva) };
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
    // Non finiscono nei motori di ricerca: le schede inventate, quelle con
    // troppo poco da dire, e l'intero archivio finché è dimostrativo.
    // `follow` resta vero: i collegamenti a comune e settore restano utili.
    robots: company.fittizia
      ? { index: false, follow: false }
      : schedaIndicizzabile(company)
        ? ROBOTS_SE_DIMOSTRATIVO
        : { index: false, follow: true },
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
  if (result.status === "unavailable") return <ServizioNonDisponibile />;

  const { company, source, fetchedAt } = result;

  // Un solo indirizzo canonico per azienda, che è anche ciò che vuole Google
  const canonico = buildAziendaSlug(company.denominazione, company.partitaIva);
  if (slug !== canonico) permanentRedirect(`/azienda/${canonico}`);

  const indicizzabile = schedaIndicizzabile(company);

  const eSocieta = !/\(D\.I\.\)|ditta individuale/i.test(company.denominazione);

  const sigla = company.sede?.provincia ?? null;
  const regione = sigla ? regioneDiSigla(sigla) : null;
  const comune = company.sede?.comune ?? null;

  // altre aziende dello stesso comune, escludendo quella che si sta leggendo
  const vicine = comune
    ? await elencoAziende({ provincia: sigla ?? undefined, comune }, { limite: 7 })
    : null;
  const simili = (vicine?.risultati ?? [])
    .filter((azienda) => azienda.partitaIva !== company.partitaIva)
    .slice(0, 6);

  // La descrizione si mostra solo se è già stata scritta. Se manca, la si
  // programma dopo la risposta: la pagina non deve aspettare un modello.
  const descrizione = await descrizioneSalvata(company.partitaIva);
  if (!descrizione) after(() => generaESalva(company));

  const percorsoComune =
    regione && sigla && comune
      ? `/aziende/${slugTerritorio(regione)}/${slugTerritorio(
          siglaToProvinciaSicura(sigla),
        )}/${slugTerritorio(comune)}`
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(company)) }}
      />

      {company.fittizia && <AvvisoDatiFittizi />}

      {regione && sigla && (
        <div className="mb-5">
          <Briciole
            voci={[
              { nome: regione, href: `/aziende/${slugTerritorio(regione)}` },
              {
                nome: siglaToProvinciaSicura(sigla),
                href: `/aziende/${slugTerritorio(regione)}/${slugTerritorio(
                  siglaToProvinciaSicura(sigla),
                )}`,
              },
              ...(comune && percorsoComune
                ? [{ nome: comune, href: percorsoComune }]
                : []),
              { nome: company.denominazione },
            ]}
          />
        </div>
      )}

      <Intestazione company={company} />

      <div className="mt-5">
        <QuickLinks company={company} />
      </div>

      <div className="mt-5 grid gap-3">
        {!company.fittizia && !indicizzabile && <SchedaParziale />}
        <FonteDati source={source} fetchedAt={fetchedAt} />
      </div>

      {/* Due colonne dai 768px in su: i dati a sinistra, la mappa e i
          recapiti in una colonna che resta visibile mentre si scorre. Sotto
          quella soglia tutto torna in colonna singola, nell'ordine in cui è
          scritto. */}
      <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <div className="grid gap-8">
          <Descrizione testo={descrizione} />
          <DatiSocieta company={company} />
          <AltreInformazioni company={company} />
          <Andamento company={company} />
          <UnitaLocali company={company} />
        </div>

        <aside className="grid gap-6 md:sticky md:top-20">
          <Mappa company={company} />
          <Contatti company={company} />
        </aside>
      </div>

      <div className="mt-10 grid gap-10">
        <DocumentiAcquistabili eSocieta={eSocieta} />
        <AziendeSimili
          titolo={comune ? `Altre aziende a ${comune}` : "Altre aziende"}
          aziende={simili}
          vediTutte={
            percorsoComune && comune
              ? { href: percorsoComune, testo: `Tutte le aziende a ${comune}` }
              : undefined
          }
        />
      </div>
    </div>
  );
}

/**
 * Le schede del dataset dimostrativo devono essere riconoscibili a colpo
 * d'occhio: nome, recapiti e numeri sono inventati, e una scheda finta
 * indistinguibile da una vera è un'informazione falsa.
 */
function AvvisoDatiFittizi() {
  return (
    <p className="border-warning/50 bg-warning-subtle/40 text-warning mb-6 flex items-start gap-2.5 border-l-4 px-4 py-3 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-medium">Azienda di esempio.</strong> Questa scheda
        appartiene a un dataset dimostrativo: denominazione, recapiti e dati
        camerali sono inventati e non corrispondono ad alcuna impresa reale.
      </span>
    </p>
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

function DatiSocieta({ company }: { company: CompanyData }) {
  const indirizzo = formatIndirizzo(company.sede);

  // PEC, sito, telefono e codice SDI stanno nella colonna di destra, accanto
  // alla mappa: sono le informazioni che si cercano insieme
  const righe: RigaOpzionale[] = [
    { etichetta: "Partita IVA", valore: company.partitaIva, numerico: true },
    company.codiceFiscale && {
      etichetta: "Codice fiscale",
      valore: mascheraCodiceFiscale(company.codiceFiscale),
      numerico: true,
    },
    {
      etichetta: "VAT europeo",
      valore: `IT${company.partitaIva}`,
      numerico: true,
      azione: (
        <Button asChild size="sm" variant="outline" className="print:hidden">
          <Link href={`/verifica-partita-iva?piva=${company.partitaIva}`}>
            Verifica su VIES
          </Link>
        </Button>
      ),
    },
    { etichetta: "Ragione sociale", valore: company.denominazione },
    company.formaGiuridica && {
      etichetta: "Forma giuridica",
      valore: company.formaGiuridica,
    },
    indirizzo && { etichetta: "Indirizzo", valore: indirizzo },
    company.reaNumero && {
      etichetta: "REA",
      valore: company.reaCciaa
        ? `${company.reaCciaa}-${company.reaNumero}`
        : company.reaNumero,
      numerico: true,
    },
    company.dipendenti !== null && {
      etichetta: "Dipendenti",
      valore: String(company.dipendenti),
      numerico: true,
    },
  ];

  return <BoxDati titolo="Dati della società" righe={righe} />;
}

function AltreInformazioni({ company }: { company: CompanyData }) {
  const anni = anniDi(company.dataCostituzione);
  const capitale = formatEuro(company.capitaleSociale);

  const risolto = company.atecoPrimario
    ? descriviAteco(company.atecoPrimario, company.atecoVersione ?? undefined)
    : null;
  const descrizioneAteco = risolto?.descrizione ?? company.atecoPrimarioDescrizione;

  const righe: RigaOpzionale[] = [
    company.dataCostituzione && {
      etichetta: "Costituita il",
      valore: (
        <>
          {formatDataIso(company.dataCostituzione)}
          {anni !== null && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · {anni} {anni === 1 ? "anno" : "anni"} di attività
            </span>
          )}
        </>
      ),
    },
    capitale && {
      etichetta: "Capitale sociale",
      valore: capitale,
      numerico: true,
    },
    company.atecoPrimario && {
      etichetta: "ATECO primario",
      valore: (
        <>
          <span className="num">{company.atecoPrimario}</span>
          {descrizioneAteco &&
            (risolto ? (
              <>
                {" — "}
                <Link
                  href={`/attivita/${slugAteco(risolto.codice, risolto.descrizione)}`}
                  className="text-primary font-normal hover:underline"
                >
                  {descrizioneAteco}
                </Link>
              </>
            ) : (
              <span className="text-muted-foreground font-normal">
                {" "}
                — {descrizioneAteco}
              </span>
            ))}
          {risolto && !risolto.esatta && (
            <span className="text-muted-foreground mt-1 block text-xs font-normal">
              Descrizione del livello superiore ({risolto.codice}): la
              corrispondenza con la classificazione ATECO 2025 non è univoca.
            </span>
          )}
          {risolto?.versioneRisolta === "2022" && (
            <span className="text-muted-foreground mt-1 block text-xs font-normal">
              Codice espresso in ATECO 2022, tradotto sulla classificazione 2025 in
              vigore.
            </span>
          )}
        </>
      ),
    },
    ...company.atecoSecondari.map((ateco) => {
      const secondario = descriviAteco(
        ateco.codice,
        company.atecoVersione ?? undefined,
      );
      return {
        etichetta: "ATECO secondario",
        valore: (
          <>
            <span className="num">{ateco.codice}</span>
            {(secondario?.descrizione ?? ateco.descrizione) && (
              <span className="text-muted-foreground font-normal">
                {" "}
                — {secondario?.descrizione ?? ateco.descrizione}
              </span>
            )}
          </>
        ),
      };
    }),
    // solo gli esercizi con un fatturato: gli anni ancora vuoti non dicono nulla
    ...company.bilanci
      .filter((bilancio) => bilancio.fatturato !== null)
      .slice(0, 5)
      .map((bilancio) => ({
        etichetta: `Fatturato ${bilancio.anno}`,
        valore: formatEuro(bilancio.fatturato) ?? "non disponibile",
        numerico: true,
      })),
  ];

  return <BoxDati titolo="Altre informazioni" righe={righe} />;
}

function Andamento({ company }: { company: CompanyData }) {
  const conFatturato = company.bilanci.filter(
    (bilancio) => bilancio.fatturato !== null,
  );
  if (conFatturato.length < 2) return null;

  return (
    <section className="print:break-inside-avoid">
      <h2 className="border-foreground mb-4 border-b-2 pb-1.5 text-sm font-semibold tracking-[0.08em] uppercase">
        Andamento del fatturato
      </h2>
      <div className="border-border bg-card border p-4">
        <AndamentoFatturato bilanci={company.bilanci} />
      </div>
    </section>
  );
}

function UnitaLocali({ company }: { company: CompanyData }) {
  if (company.unitaLocali.length === 0) return null;

  const righe: Riga[] = company.unitaLocali.map((unita, indice) => ({
    etichetta: unita.denominazione ?? `Unità locale ${indice + 1}`,
    valore: formatIndirizzo(unita.indirizzo) ?? "Indirizzo non disponibile",
  }));

  return (
    <BoxDati
      titolo={`Unità locali (${company.unitaLocali.length})`}
      righe={righe}
    />
  );
}

function Mappa({ company }: { company: CompanyData }) {
  const comune = company.sede?.comune
    ? normalizzaComune(company.sede.comune, company.sede.provincia)
    : null;

  // il fornitore dà le coordinate della sede: molto meglio del centro del
  // comune, e si può ingrandire di più
  const precise = company.coordinate;
  const lat = precise?.lat ?? comune?.lat;
  const lon = precise?.lon ?? comune?.lon;

  if (lat === undefined || lon === undefined) return null;

  return (
    <section className="print:hidden">
      <h2 className="border-foreground mb-4 border-b-2 pb-1.5 text-sm font-semibold tracking-[0.08em] uppercase">
        Dove si trova
      </h2>
      <MappaStatica
        lat={lat}
        lon={lon}
        zoom={precise ? 16 : 14}
        etichetta={
          precise
            ? (formatIndirizzo(company.sede) ?? "la sede")
            : `${comune!.comune} (${comune!.sigla})`
        }
        esatta={Boolean(precise)}
      />
    </section>
  );
}

/** I recapiti, accanto alla mappa: sono le informazioni che si cercano insieme. */
function Contatti({ company }: { company: CompanyData }) {
  const sito = toSitoHref(company.sitoWeb);

  const righe: RigaOpzionale[] = [
    company.pec && {
      etichetta: "PEC",
      valore: (
        <a className="text-primary hover:underline" href={`mailto:${company.pec}`}>
          {company.pec}
        </a>
      ),
    },
    sito && {
      etichetta: "Sito web",
      valore: (
        <a
          className="text-primary hover:underline"
          href={sito}
          target="_blank"
          rel="noopener noreferrer"
        >
          {hostnameDi(company.sitoWeb)}
        </a>
      ),
    },
    company.telefono && {
      etichetta: "Telefono",
      valore: company.telefono,
      numerico: true,
    },
    company.codiceSdi && {
      etichetta: "Codice SDI",
      valore: company.codiceSdi,
      numerico: true,
    },
  ];

  return <BoxDati titolo="Contatti" righe={righe} />;
}

function ServizioNonDisponibile() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
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

/** Il nome esteso di una provincia, con la sigla come ripiego. */
function siglaToProvinciaSicura(sigla: string): string {
  return siglaToProvincia(sigla) ?? sigla;
}
