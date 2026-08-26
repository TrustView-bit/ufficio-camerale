import { NextResponse, type NextRequest } from "next/server";

import { checkVies } from "@/lib/providers/vies";
import { partitaIvaSchema } from "@/lib/validation";

/**
 * Verifica una Partita IVA su VIES.
 *
 * La chiamata esterna resta lato server: il client non parla mai
 * direttamente con la Commissione europea.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("piva");

  if (!raw) {
    return NextResponse.json(
      { error: "Parametro 'piva' mancante." },
      { status: 400 },
    );
  }

  const parsed = partitaIvaSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "invalid-input",
        error: "La Partita IVA non è formalmente valida.",
      },
      { status: 400 },
    );
  }

  const result = await checkVies(parsed.data);

  // Un'indisponibilità di VIES non è un errore di questo servizio: si
  // risponde 200 con lo stato, e la UI decide come degradare.
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
