import type { Metadata } from "next";

import { PaginaInPreparazione } from "@/components/pagina-in-preparazione";

export const metadata: Metadata = { title: "Termini" };

export default function Page() {
  return (
    <PaginaInPreparazione
      titolo="Termini di servizio"
      descrizione="I termini d'uso del servizio, con i limiti di responsabilità sulla completezza e sull'aggiornamento dei dati provenienti da fonti pubbliche, saranno pubblicati prima della messa online."
    />
  );
}
