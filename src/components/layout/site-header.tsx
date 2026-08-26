import { Landmark } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/verifica-partita-iva", label: "Verifica P.IVA" },
  { href: "/ricerca", label: "Ricerca aziende" },
  { href: "/chi-siamo", label: "Chi siamo" },
] as const;

export function SiteHeader() {
  return (
    <header
      data-site-chrome
      className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight"
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Landmark className="size-4" aria-hidden />
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
                  className="text-muted-foreground ease-ui hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors duration-150"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto sm:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
