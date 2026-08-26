import { NextResponse, type NextRequest } from "next/server";

import { lookupCompany } from "@/lib/companies";
import { PROVIDER_UNAVAILABLE_MESSAGE } from "@/lib/providers/types";
import { applicaLimite } from "@/lib/rate-limit/guard";
import { partitaIvaSchema } from "@/lib/validation";

/**
 * Dati camerali di un'impresa.
 *
 * `?refresh=1` forza una nuova interrogazione al provider, saltando cache e
 * archivio: è l'unico modo per far spendere di proposito.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partitaIva: string }> },
) {
  const limite = await applicaLimite(request);
  if (limite.bloccato) return limite.risposta;

  const { partitaIva } = await params;

  const parsed = partitaIvaSchema.safeParse(partitaIva);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La Partita IVA non è formalmente valida." },
      { status: 400 },
    );
  }

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const result = await lookupCompany(parsed.data, { forceRefresh });

  if (result.status === "not-found") {
    return NextResponse.json(
      {
        status: "not-found",
        error: "Nessuna impresa trovata con questa Partita IVA.",
      },
      { status: 404 },
    );
  }

  if (result.status === "unavailable") {
    // 503: è il fornitore a non rispondere, non una richiesta sbagliata
    return NextResponse.json(
      {
        status: "unavailable",
        reason: result.reason,
        error: PROVIDER_UNAVAILABLE_MESSAGE[result.reason],
      },
      { status: 503 },
    );
  }

  return NextResponse.json(result, { headers: limite.intestazioni });
}
