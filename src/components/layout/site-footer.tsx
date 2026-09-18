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
      <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase mb-4">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-150"
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
    <footer data-site-chrome className="border-border bg-muted/30 mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Riga principale: brand + nav */}
        <div className="grid gap-10 py-12 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <p className="text-foreground text-sm font-semibold">Catalogo Imprese</p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Dati pubblici del Registro Imprese e VIES, raccolti in un&apos;unica scheda.
            </p>
          </div>

          <FooterNav title="Servizio" items={SERVIZIO} />
          <FooterNav title="Legale" items={LEGALE} />
        </div>

        {/* Separatore */}
        <div className="border-border border-t" />

        {/* Disclaimer legale */}
        <div className="border-border/60 bg-muted/50 my-6 rounded-lg border px-5 py-4">
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            I dati pubblicati e i documenti in vendita sono forniti nella loro forma originale e non
            subiscono modifiche o rielaborazioni. Non esprimono valutazioni o giudizi sulla solidità,
            affidabilità o comportamento economico delle aziende o delle persone né costituiscono
            analisi o raccomandazioni per decisioni aziendali e non rientrano quindi tra le attività
            soggette a licenza TULPS art.&nbsp;134 e s.m.i.
          </p>
        </div>

        {/* Copyright */}
        <p className="text-muted-foreground pb-8 text-xs">
          © Copyright {new Date().getFullYear()} AdCapital Srl&ensp;·&ensp;P.IVA IT11372821006
        </p>

      </div>
    </footer>
  );
}
