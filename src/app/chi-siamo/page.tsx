import type { Metadata } from "next";
import Link from "next/link";

import { PaginaLegale } from "@/components/legale/pagina-legale";
import { campo, SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Chi siamo",
  description:
    "Che cos'è Ufficio Camerale, da dove prende i dati e che cosa non è.",
};

export default function ChiSiamoPage() {
  return (
    <PaginaLegale
      titolo="Chi siamo"
      sommario="Un servizio indipendente per consultare dati d'impresa già pubblici, scritti in modo leggibile."
    >
      <h2>Che cosa facciamo</h2>
      <p>
        Le informazioni sulle imprese italiane sono pubbliche per legge, ma trovarle
        richiede di sapere dove cercare e come leggere quello che si trova.{" "}
        {SITE.nome} raccoglie in una pagina sola quello che serve per farsi
        un&apos;idea di una controparte: chi è, dove ha sede, che attività svolge,
        se è ancora attiva, come contattarla.
      </p>
      <p>
        Digiti una Partita IVA, un codice fiscale o una ragione sociale: capiamo da
        soli di cosa si tratta e ti mostriamo la scheda.
      </p>

      <h2>Da dove vengono i dati</h2>
      <ul>
        <li>
          <strong>Registro Imprese</strong> — l&apos;anagrafica camerale, tramite un
          fornitore autorizzato all&apos;accesso.
        </li>
        <li>
          <strong>VIES</strong> — il sistema della Commissione europea che conferma
          la validità di una Partita IVA per gli scambi intracomunitari,
          consultabile dalla{" "}
          <Link href="/verifica-partita-iva">pagina dedicata</Link>.
        </li>
      </ul>
      <p>
        Ogni scheda riporta la data in cui il dato è stato scaricato. Quando la
        fonte non risponde te lo diciamo apertamente, invece di mostrare un dato
        vecchio come se fosse fresco.
      </p>

      <h2>Che cosa non siamo</h2>
      <p>
        Non siamo la Camera di Commercio, né InfoCamere, né Unioncamere, e non
        abbiamo alcun rapporto con questi enti. Non rilasciamo visure né certificati
        con valore legale: per quelli occorre rivolgersi ai canali ufficiali.
      </p>
      <p>
        Non vendiamo elenchi, non facciamo profilazione e non cediamo dati a terzi
        per finalità commerciali.
      </p>

      <h2>Segnalazioni</h2>
      <p>
        Se trovi un errore, o se sei titolare di un&apos;impresa individuale e vuoi
        chiedere la rimozione della tua scheda, scrivi a {campo(SITE.emailContatti)}
        . La procedura è descritta nell&apos;
        <Link href="/privacy">informativa privacy</Link>.
      </p>
    </PaginaLegale>
  );
}
