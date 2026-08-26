import type { Metadata } from "next";
import { CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";

import { ViesCheckForm } from "@/components/vies/vies-check-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VIES_TIMEOUT_MS } from "@/lib/providers/vies";
import { normalizePartitaIva } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Verifica Partita IVA su VIES",
  description:
    "Verifica gratuitamente se una Partita IVA italiana è registrata negli scambi intracomunitari, tramite il servizio VIES della Commissione europea.",
};

const ESITI = [
  {
    icon: CircleCheck,
    tone: "text-success",
    title: "Partita IVA valida",
    body: "La partita risulta registrata e attiva negli scambi intracomunitari. Se lo Stato membro lo consente, VIES restituisce anche denominazione e indirizzo: l'Italia spesso non li divulga, quindi vederli assenti è normale.",
  },
  {
    icon: CircleSlash,
    tone: "text-danger",
    title: "Partita IVA non registrata",
    body: "VIES non trova la partita. Può non essere mai esistita, oppure essere stata cessata. Attenzione: un'impresa può essere perfettamente attiva in Italia senza comparire in VIES, se non è abilitata alle operazioni intracomunitarie.",
  },
  {
    icon: TriangleAlert,
    tone: "text-warning",
    title: "Servizio non disponibile",
    body: "VIES interroga in tempo reale l'anagrafe tributaria del singolo Stato, che può non rispondere. In questo caso non sai nulla sulla partita: non è un esito negativo, è un'assenza di risposta.",
  },
] as const;

export default async function VerificaPartitaIvaPage({
  searchParams,
}: {
  searchParams: Promise<{ piva?: string }>;
}) {
  const { piva } = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Verifica una Partita IVA su VIES
      </h1>

      <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
        VIES è il registro della Commissione europea che conferma se una Partita IVA
        è valida per gli scambi intracomunitari. La verifica è gratuita e la
        richiesta parte dai nostri server: il tuo browser non contatta mai
        direttamente la Commissione.
      </p>

      <div className="mt-8 max-w-2xl">
        <ViesCheckForm defaultValue={piva ? normalizePartitaIva(piva) : ""} />
      </div>

      <section className="mt-14" aria-labelledby="significato">
        <h2 id="significato" className="text-xl font-semibold tracking-tight">
          Che cosa significa il risultato
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ESITI.map(({ icon: Icon, tone, title, body }) => (
            <Card key={title} className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={`size-4 ${tone}`} aria-hidden />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm leading-relaxed">
                {body}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 max-w-2xl" aria-labelledby="limiti">
        <h2 id="limiti" className="text-xl font-semibold tracking-tight">
          Limiti da conoscere
        </h2>
        <ul className="text-muted-foreground mt-4 space-y-3 text-sm leading-relaxed">
          <li>
            <strong className="text-foreground font-medium">
              VIES non è il Registro Imprese.
            </strong>{" "}
            Dice se una partita è valida per l&apos;IVA intracomunitaria, non se
            l&apos;azienda è attiva, chi la amministra o che cosa faccia.
          </li>
          <li>
            <strong className="text-foreground font-medium">
              L&apos;assenza di risposta non è un esito.
            </strong>{" "}
            Se l&apos;anagrafe italiana non risponde entro {VIES_TIMEOUT_MS / 1000}{" "}
            secondi interrompiamo l&apos;attesa e te lo diciamo, invece di lasciarti
            davanti a una rotella che gira.
          </li>
          <li>
            <strong className="text-foreground font-medium">
              Il controllo della cifra di controllo è un&apos;altra cosa.
            </strong>{" "}
            Avviene nel tuo browser e dice solo se il numero è ben formato: una
            Partita IVA può superarlo senza essere mai stata assegnata.
          </li>
        </ul>
      </section>
    </div>
  );
}
