import type { Metadata } from "next";

import { PaginaInPreparazione } from "@/components/pagina-in-preparazione";

export const metadata: Metadata = { title: "Cookie" };

export default function Page() {
  return (
    <PaginaInPreparazione
      titolo="Cookie policy"
      descrizione="L'elenco dei cookie e delle tecnologie di memorizzazione usate dal sito sarà pubblicato prima della messa online. Al momento il portale salva soltanto le tue ricerche recenti nel tuo browser, senza inviarle al server."
    />
  );
}
