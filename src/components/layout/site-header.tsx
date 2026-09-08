import Image from "next/image";
import Link from "next/link";

/**
 * Testata del portale: barra di servizio scura, fascia del marchio, riga dei
 * menu. Statica, non segue lo scorrimento — è un'intestazione di documento,
 * non una barra di applicazione.
 *
 * Le voci puntano solo a pagine che esistono: una testata piena di
 * collegamenti morti è peggio di una testata scarna.
 */

const SERVIZIO = [
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/privacy", label: "Privacy" },
  { href: "/termini", label: "Termini" },
  { href: "/cookie", label: "Cookie" },
] as const;

const PRINCIPALE = [
  { href: "/verifica-partita-iva", label: "Verifica P.IVA" },
  { href: "/ricerca", label: "Ricerca aziende" },
  { href: "/aziende", label: "Per territorio" },
  { href: "/attivita", label: "Per settore" },
] as const;

export function SiteHeader() {
  return (
    <header data-site-chrome className="text-testata-foreground border-border border-b">
      {/* barra di servizio */}
      <div className="bg-testata-scura">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav aria-label="Collegamenti di servizio">
            <ul className="flex items-center gap-5 overflow-x-auto py-2 text-xs whitespace-nowrap">
              {SERVIZIO.map((voce) => (
                <li key={voce.href}>
                  <Link
                    href={voce.href}
                    className="ease-ui text-muted-foreground hover:text-foreground rounded-sm transition-colors duration-150"
                  >
                    {voce.label}
                  </Link>
                </li>
              ))}
              <li className="text-muted-foreground ml-auto hidden sm:block">
                Dati pubblici del Registro Imprese
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* fascia del marchio */}
      <div className="bg-testata">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-4 rounded-sm">
            <Image
              src="/sigillo.png"
              alt=""
              width={64}
              height={64}
              priority
              className="size-16 shrink-0"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-primary text-2xl font-bold tracking-wide uppercase sm:text-3xl">
                Catalogo Imprese
              </span>
              <span className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase sm:text-xs">
                Consultazione di dati pubblici d&apos;impresa
              </span>
            </span>
          </Link>
        </div>

        {/* riga dei menu */}
        <div className="border-testata-bordo border-t">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <nav aria-label="Navigazione principale">
              <ul className="flex items-center gap-6 overflow-x-auto py-3 text-sm whitespace-nowrap sm:gap-9">
                {PRINCIPALE.map((voce) => (
                  <li key={voce.href}>
                    <Link
                      href={voce.href}
                      className="ease-ui decoration-primary/50 hover:text-primary rounded-sm font-medium underline-offset-[6px] transition-colors duration-150 hover:underline"
                    >
                      {voce.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
