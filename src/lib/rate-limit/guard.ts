import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { descriviAttesa } from "./attesa";
import { getRateLimiter, identificaChiamante, intestazioniLimite } from "./index";

/**
 * Applica il limite di richieste a una Route Handler.
 *
 * Restituisce una risposta 429 già pronta se il chiamante ha superato il
 * limite, altrimenti le intestazioni da allegare alla risposta vera.
 */
export async function applicaLimite(
  request: NextRequest,
): Promise<
  | { bloccato: true; risposta: NextResponse }
  | { bloccato: false; intestazioni: Record<string, string> }
> {
  const esito = await getRateLimiter().check(identificaChiamante(request));
  const intestazioni = intestazioniLimite(esito);

  if (esito.success) return { bloccato: false, intestazioni };

  const attesaSecondi = Math.max(1, Math.ceil((esito.reset - Date.now()) / 1000));

  return {
    bloccato: true,
    risposta: NextResponse.json(
      {
        error: `Hai fatto troppe ricerche di seguito. Riprova fra ${descriviAttesa(attesaSecondi)}.`,
      },
      {
        status: 429,
        headers: { ...intestazioni, "Retry-After": String(attesaSecondi) },
      },
    ),
  };
}
