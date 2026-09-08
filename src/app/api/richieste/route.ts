import { NextResponse, type NextRequest } from "next/server";

import { applicaLimite } from "@/lib/rate-limit/guard";
import { registraRichiesta, richiestaSchema } from "@/lib/richieste";

/**
 * Riceve la richiesta di un documento e la mette in archivio.
 *
 * Non parte nessun pagamento: chi gestisce il portale legge la richiesta e
 * risponde per email con il collegamento per procedere all'acquisto.
 */
export async function POST(request: NextRequest) {
  const limite = await applicaLimite(request);
  if (limite.bloccato) return limite.risposta;

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non leggibile." }, { status: 400 });
  }

  const parsed = richiestaSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Controlla i dati inseriti.",
        campi: parsed.error.issues.map((problema) => ({
          campo: String(problema.path[0] ?? ""),
          messaggio: problema.message,
        })),
      },
      { status: 400 },
    );
  }

  const esito = await registraRichiesta(parsed.data);

  if (!esito.ok) {
    // 503: è il servizio a non poter salvare, non l'utente ad aver sbagliato
    return NextResponse.json(
      {
        error:
          "Non riusciamo a registrare la richiesta in questo momento. Riprova fra qualche minuto.",
        motivo: esito.motivo,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, id: esito.id }, { headers: limite.intestazioni });
}
