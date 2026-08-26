import type { Metadata } from "next";

import { PaginaInPreparazione } from "@/components/pagina-in-preparazione";

export const metadata: Metadata = { title: "Chi siamo" };

export default function Page() {
  return (
    <PaginaInPreparazione
      titolo="Chi siamo"
      descrizione="Ufficio Camerale è un servizio indipendente di consultazione dei dati camerali pubblici. Non è affiliato né collegato alle Camere di Commercio, a InfoCamere o ad Unioncamere. Questa pagina sarà completata prima della pubblicazione."
    />
  );
}
