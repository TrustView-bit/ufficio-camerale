import type { Database } from "@/lib/db";
import { richiesteDocumenti } from "@/lib/db/schema";
import { DOCUMENTI } from "@/lib/documenti";

import type { Richiesta } from "./schema";

export type EsitoSalvataggio =
  | { ok: true; id: number }
  /** Senza archivio la richiesta non ha dove andare: si dice, non si finge. */
  | { ok: false; motivo: "archivio-assente" | "scrittura-fallita" };

/**
 * Salva la richiesta così com'è stata fatta.
 *
 * Il nome e il prezzo del documento si copiano dal catalogo al momento
 * del salvataggio: se il listino cambia domani, la richiesta ricorda cosa
 * aveva visto l'utente, che è ciò a cui si risponderà.
 */
export async function salvaRichiesta(
  db: Database | null,
  richiesta: Richiesta,
): Promise<EsitoSalvataggio> {
  if (!db) return { ok: false, motivo: "archivio-assente" };

  const documento = DOCUMENTI.find((voce) => voce.id === richiesta.documentoId)!;

  try {
    const [riga] = await db
      .insert(richiesteDocumenti)
      .values({
        partitaIva: richiesta.partitaIva,
        denominazione: richiesta.denominazione,
        documentoId: documento.id,
        documentoNome: documento.nome,
        prezzoIndicativo: documento.prezzo.toFixed(2),
        nome: richiesta.nome,
        email: richiesta.email,
        telefono: richiesta.telefono,
        note: richiesta.note,
      })
      .returning({ id: richiesteDocumenti.id });

    return riga ? { ok: true, id: riga.id } : { ok: false, motivo: "scrittura-fallita" };
  } catch {
    return { ok: false, motivo: "scrittura-fallita" };
  }
}
