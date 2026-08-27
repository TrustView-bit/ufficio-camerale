import { Landmark } from "lucide-react";
import Link from "next/link";

const NAV = [
  { href: "/verifica-partita-iva", label: "Verifica P.IVA" },
  { href: "/ricerca", label: "Ricerca aziende" },
  { href: "/aziende", label: "Per territorio" },
  { href: "/attivita", label: "Per settore" },
  { href: "/chi-siamo", label: "Chi siamo" },
] as const;

export function SiteHeader() {
  return (
    <header
      data-site-chrome
      className="border-border bg-background sticky top-0 z-40 border-b"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight"
        >
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <Landmark className="size-3.5" aria-hidden />
          </span>
          <span className="text-[15px]">Ufficio Camerale</span>
        </Link>

        <nav
          aria-label="Navigazione principale"
          className="ml-auto hidden sm:block"
        >
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted-foreground ease-ui hover:text-foreground rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
