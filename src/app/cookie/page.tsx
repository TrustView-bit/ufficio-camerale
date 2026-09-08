import type { Metadata } from "next";

import { PaginaLegale } from "@/components/legale/pagina-legale";
import { campo, SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Cookie e memorizzazione locale",
  description:
    "Quali tecnologie di memorizzazione usa Catalogo Imprese e perché non compare alcun banner sui cookie.",
};

export default function CookiePage() {
  return (
    <PaginaLegale
      titolo="Cookie e memorizzazione locale"
      sommario="Che cosa viene salvato nel tuo browser, e perché non ti chiediamo alcun consenso."
    >
      <h2>Nessun banner, e c&apos;è un motivo</h2>
      <p>
        Non troverai una finestra che ti chiede di accettare i cookie, perché non
        usiamo cookie di profilazione, di analisi o di terze parti. Il consenso va
        chiesto per quelli: chiederlo quando non servono sarebbe soltanto un
        fastidio inutile.
      </p>

      <h2>Che cosa salviamo davvero</h2>
      <dl>
        <dt>Ricerche recenti</dt>
        <dd>
          Le ultime cinque ricerche restano nella memoria locale del tuo browser (
          <code>localStorage</code>), per mostrartele in home page. Non lasciano mai
          il tuo dispositivo e non raggiungono i nostri server. Puoi cancellarle dal
          pulsante accanto all&apos;elenco, o svuotando i dati del sito dalle
          impostazioni del browser.
        </dd>
        <dt>Preferenza di tema</dt>
        <dd>
          La scelta fra tema chiaro e scuro è conservata nel tuo browser, così il
          sito si ripresenta come lo hai lasciato.
        </dd>
      </dl>
      <p>
        Entrambe rientrano fra le tecnologie strettamente necessarie a fornire un
        servizio richiesto dall&apos;utente, per le quali l&apos;articolo 122 del
        Codice privacy non richiede consenso preventivo.
      </p>

      <h2>Se cambierà qualcosa</h2>
      <p>
        Se in futuro introdurremo strumenti di analisi del traffico, questa pagina
        sarà aggiornata e comparirà una richiesta di consenso preventivo, con la
        possibilità di rifiutare senza perdere l&apos;accesso al servizio.
      </p>

      <h2>Domande</h2>
      <p>Per qualunque chiarimento scrivi a {campo(SITE.emailPrivacy)}.</p>
    </PaginaLegale>
  );
}
