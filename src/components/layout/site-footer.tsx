import Link from "next/link";

const SERVIZIO = [
  { href: "/verifica-partita-iva", label: "Verifica P.IVA" },
  { href: "/ricerca", label: "Ricerca aziende" },
  { href: "/aziende", label: "Per territorio" },
  { href: "/attivita", label: "Per settore" },
  { href: "/chi-siamo", label: "Chi siamo" },
] as const;

const LEGALE = [
  { href: "/privacy", label: "Privacy" },
  { href: "/termini", label: "Termini" },
  { href: "/cookie", label: "Cookie" },
] as const;

function FooterNav({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-muted-foreground ease-ui hover:text-foreground rounded-md text-sm transition-colors duration-150"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer data-site-chrome className="border-border bg-muted/40 mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <FooterNav title="Servizio" items={SERVIZIO} />
          <FooterNav title="Legale" items={LEGALE} />
        </div>

        <p className="text-muted-foreground mt-10 text-xs leading-relaxed">
          I dati pubblicati e i documenti in vendita sono forniti nella loro forma originale e non
          subiscono modifiche o rielaborazioni. Non esprimono valutazioni o giudizi sulla solidità,
          affidabilità o comportamento economico delle aziende o delle persone né costituiscono
          analisi o raccomandazioni per decisioni aziendali e non rientrano quindi tra le attività
          soggette a licenza TULPS art. 134 e s.m.i.
        </p>

        <p className="text-muted-foreground mt-4 text-xs">
          © Copyright {new Date().getFullYear()} AdCapital Srl | P.IVA IT11372821006
        </p>
      </div>
    </footer>
  );
}
