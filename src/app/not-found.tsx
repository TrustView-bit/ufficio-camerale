import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="num text-muted-foreground text-sm font-medium">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Pagina non trovata
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        L&apos;indirizzo che hai aperto non esiste o non è più disponibile.
      </p>
      <Button asChild className="mt-7">
        <Link href="/">Torna alla ricerca</Link>
      </Button>
    </div>
  );
}
