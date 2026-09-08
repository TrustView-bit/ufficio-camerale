import type { Metadata } from "next";

import { PaginaLegale } from "@/components/legale/pagina-legale";
import { campo, SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Termini di servizio",
  description:
    "Condizioni d'uso di Catalogo Imprese, limiti di responsabilità sui dati e regole di utilizzo.",
};

export default function TerminiPage() {
  return (
    <PaginaLegale
      titolo="Termini di servizio"
      sommario="Le regole d'uso di Catalogo Imprese e i limiti di ciò che il servizio garantisce."
    >
      <h2>Che cos&apos;è questo servizio</h2>
      <p>
        {SITE.nome} è un servizio di consultazione di informazioni provenienti da
        registri pubblici: il Registro Imprese e il sistema VIES della Commissione
        europea. È gestito da {campo(SITE.titolare)}.
      </p>
      <p>
        Raccoglie e organizza informazioni pubbliche provenienti dal Registro
        Imprese e dal sistema VIES. Non rilascia visure, certificati o documenti
        aventi valore legale: per quelli occorre rivolgersi alla Camera di
        Commercio competente o ai canali ufficiali del Registro Imprese.
      </p>

      <h2>Che cosa non garantiamo</h2>
      <p>
        I dati sono ripresi da fonti terze e possono essere incompleti, non
        aggiornati o errati alla fonte. Ogni scheda indica la data in cui il dato è
        stato scaricato: quella data è l&apos;unica garanzia di attualità che
        possiamo offrire.
      </p>
      <p>
        Il servizio è fornito «così com&apos;è», senza garanzie di continuità,
        completezza o adeguatezza a uno scopo specifico. Non rispondiamo di
        decisioni prese sulla base delle informazioni pubblicate: per scelte con
        conseguenze economiche o legali, verifica sempre alla fonte ufficiale.
      </p>
      <p>
        La verifica su VIES riporta l&apos;esito comunicato dalla Commissione
        europea. Quando il servizio non risponde, la pagina lo dichiara: quella non
        è una risposta negativa, è un&apos;assenza di risposta.
      </p>

      <h2>Come si può usare</h2>
      <p>Il servizio è destinato a consultazioni puntuali. Non è consentito:</p>
      <ul>
        <li>
          estrarre in modo sistematico o massivo i contenuti, con qualsiasi
          strumento automatico;
        </li>
        <li>aggirare o tentare di aggirare i limiti sul numero di richieste;</li>
        <li>
          ripubblicare o rivendere i dati, in tutto o in parte, come banca dati
          propria;
        </li>
        <li>usare i recapiti pubblicati per invii commerciali non richiesti.</li>
      </ul>
      <p>
        Il numero di richieste per indirizzo IP è limitato. Superata la soglia, il
        servizio risponde indicando fra quanto tempo sarà nuovamente disponibile.
      </p>

      <h2>Segnalazioni e correzioni</h2>
      <p>
        Se trovi un dato errato scrivi a {campo(SITE.emailContatti)}. Se il dato è
        inesatto rispetto al Registro Imprese lo correggiamo; se è corretto ma
        riguarda te e chiedi la rimozione, vedi la procedura descritta
        nell&apos;informativa privacy.
      </p>

      <h2>Modifiche</h2>
      <p>
        Questi termini possono cambiare. La data in cima alla pagina indica
        l&apos;ultima revisione. L&apos;uso del servizio dopo una modifica comporta
        l&apos;accettazione della versione aggiornata.
      </p>

      <h2>Legge applicabile</h2>
      <p>
        Al servizio si applica la legge italiana. Per i consumatori resta ferma la
        competenza del foro di residenza o domicilio.
      </p>
    </PaginaLegale>
  );
}
