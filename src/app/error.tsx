"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Qualcosa non ha funzionato
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        Si è verificato un errore imprevisto. Riprova: se il problema persiste,
        potrebbe trattarsi di un disservizio temporaneo.
      </p>
      <Button onClick={reset} className="mt-7">
        Riprova
      </Button>
    </div>
  );
}
