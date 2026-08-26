import type { Metadata } from "next";

import { PaginaInPreparazione } from "@/components/pagina-in-preparazione";

export const metadata: Metadata = { title: "Privacy" };

export default function Page() {
  return (
    <PaginaInPreparazione
      titolo="Informativa privacy"
      descrizione="L'informativa ai sensi del GDPR, con le finalità del trattamento, le basi giuridiche e la procedura per richiedere rettifica o cancellazione dei dati (artt. 16-17), sarà pubblicata prima della messa online del servizio."
    />
  );
}
