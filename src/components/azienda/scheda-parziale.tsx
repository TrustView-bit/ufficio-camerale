import { Info } from "lucide-react";

/**
 * Dice al lettore perché la pagina è così scarna.
 *
 * Di queste imprese l'archivio conosce poco più del nome: senza una riga che
 * lo dichiari, la scheda sembrerebbe affermare che quei dati non esistono,
 * mentre semplicemente non li abbiamo. È la stessa regola che vale per il
 * fornitore che non risponde — un'assenza di informazione non va mai
 * presentata come una risposta negativa.
 */
export function SchedaParziale() {
  return (
    <p className="border-border bg-muted/40 text-muted-foreground flex items-start gap-2 border-l-4 px-3 py-2 text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Di questa impresa l&apos;archivio conserva solo i dati identificativi e la
        sede. Gli altri campi non sono vuoti perché mancanti nel Registro Imprese,
        ma perché non ancora acquisiti.
      </span>
    </p>
  );
}
