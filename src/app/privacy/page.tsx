import type { Metadata } from "next";

import { PaginaLegale } from "@/components/legale/pagina-legale";
import { campo, SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Informativa privacy",
  description:
    "Come Catalogo Imprese tratta i dati personali, quali sono le fonti e come esercitare i diritti previsti dal GDPR.",
};

export default function PrivacyPage() {
  return (
    <PaginaLegale
      titolo="Informativa privacy"
      sommario="Ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679 (GDPR)."
    >
      <h2>Chi tratta i tuoi dati</h2>
      <p>
        Il titolare del trattamento è <strong>{campo(SITE.titolare)}</strong>, con
        sede in {campo(SITE.indirizzoTitolare)}. Per qualunque questione relativa ai
        dati personali puoi scrivere a <strong>{campo(SITE.emailPrivacy)}</strong>.
      </p>

      <h2>Quali dati trattiamo</h2>

      <h3>Dati delle imprese</h3>
      <p>
        Il servizio mostra informazioni provenienti da registri pubblici: il
        Registro Imprese tenuto dalle Camere di Commercio e il sistema VIES della
        Commissione europea. Si tratta di denominazione, Partita IVA, codice
        fiscale, sede, codici ATECO, numero REA, capitale sociale, stato attività,
        PEC e altri recapiti aziendali.
      </p>
      <p>
        La maggior parte di queste informazioni riguarda persone giuridiche e non
        costituisce dato personale. Fanno eccezione le{" "}
        <strong>imprese individuali e le ditte individuali</strong>, dove
        denominazione, sede e recapiti possono coincidere con quelli di una persona
        fisica: in questi casi il trattamento rientra pienamente nel GDPR, e valgono
        tutti i diritti descritti più avanti.
      </p>

      <h3>Dati di chi usa il sito</h3>
      <p>
        Per far funzionare il servizio trattiamo il tuo indirizzo IP, usato
        esclusivamente per limitare il numero di richieste ed evitare abusi
        automatizzati. Il conteggio è temporaneo e non viene collegato alla tua
        identità né alle ricerche effettuate.
      </p>
      <p>
        Le <strong>ricerche recenti</strong> che vedi in home page sono salvate nel
        tuo browser e non vengono mai inviate ai nostri server. Puoi cancellarle in
        qualsiasi momento dal pulsante accanto all&apos;elenco.
      </p>

      <h2>Perché li trattiamo, e su quale base</h2>
      <dl>
        <dt>Consultazione dei dati camerali</dt>
        <dd>
          Legittimo interesse (art. 6.1.f GDPR) alla diffusione di informazioni già
          pubbliche per legge, funzionale alla trasparenza dei rapporti commerciali
          e alla verifica dell&apos;affidabilità di una controparte.
        </dd>
        <dt>Verifica delle Partite IVA su VIES</dt>
        <dd>Legittimo interesse (art. 6.1.f GDPR), su tua esplicita richiesta.</dd>
        <dt>Limitazione delle richieste e sicurezza</dt>
        <dd>
          Legittimo interesse (art. 6.1.f GDPR) a mantenere il servizio disponibile
          e protetto da usi automatizzati.
        </dd>
      </dl>

      <h2>Da dove vengono i dati</h2>
      <p>
        I dati camerali non sono raccolti direttamente presso di te: provengono dal
        Registro Imprese, consultato tramite un fornitore autorizzato, e dal sistema
        VIES della Commissione europea. Sono registri pubblici, accessibili a
        chiunque per previsione di legge.
      </p>

      <h2>Per quanto tempo li conserviamo</h2>
      <p>
        I dati camerali interrogati vengono conservati per riutilizzarli senza
        interrogare nuovamente la fonte, e aggiornati periodicamente. Vengono
        cancellati se l&apos;impresa risulta cessata da oltre cinque anni, o su tua
        richiesta secondo quanto indicato più sotto.
      </p>
      <p>
        Gli indirizzi IP usati per il conteggio delle richieste sono conservati al
        massimo ventiquattro ore.
      </p>

      <h2>Chi altro vede i dati</h2>
      <p>
        Ci avvaliamo di fornitori che agiscono come responsabili del trattamento per
        l&apos;infrastruttura del servizio: l&apos;hosting, la banca dati, la cache
        e la generazione delle descrizioni testuali. Alcuni di questi fornitori
        hanno sede negli Stati Uniti; in tal caso il trasferimento avviene sulla
        base delle clausole contrattuali tipo approvate dalla Commissione europea o
        di una decisione di adeguatezza.
      </p>
      <p>
        Non vendiamo, cediamo né comunichiamo dati a terzi per finalità commerciali
        o di marketing.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere in qualsiasi momento di <strong>accedere</strong> ai dati che
        ti riguardano (art. 15), di <strong>rettificarli</strong> se inesatti (art.
        16), di <strong>cancellarli</strong> (art. 17), di{" "}
        <strong>limitarne il trattamento</strong> (art. 18), di{" "}
        <strong>riceverli</strong> in formato leggibile (art. 20) e di{" "}
        <strong>opporti</strong> al trattamento fondato sul legittimo interesse
        (art. 21).
      </p>

      <h3>Come chiedere una rettifica o una cancellazione</h3>
      <p>
        Scrivi a <strong>{campo(SITE.emailPrivacy)}</strong> indicando la Partita
        IVA interessata e che cosa chiedi. Rispondiamo entro trenta giorni.
      </p>
      <p>
        Una precisazione che conta: se il dato è{" "}
        <em>inesatto rispetto al Registro Imprese</em>, lo correggiamo o lo
        riallineiamo alla fonte. Se invece è <em>corretto ma non lo condividi</em>,
        la modifica va richiesta alla Camera di Commercio competente, perché noi
        riportiamo quanto risulta nel registro pubblico e non abbiamo il potere di
        alterarlo. Possiamo però rimuovere la scheda dal nostro servizio e dai
        motori di ricerca, ed è quello che facciamo su richiesta motivata di una
        persona fisica.
      </p>

      <h2>Reclamo</h2>
      <p>
        Se ritieni che il trattamento violi il GDPR puoi presentare reclamo al
        Garante per la protezione dei dati personali (
        <a
          href="https://www.garanteprivacy.it"
          target="_blank"
          rel="noopener noreferrer"
        >
          garanteprivacy.it
        </a>
        ) o all&apos;autorità di controllo del tuo Stato di residenza.
      </p>
    </PaginaLegale>
  );
}
