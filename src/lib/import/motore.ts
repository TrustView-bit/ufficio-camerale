import { eq, inArray } from "drizzle-orm";

import { descriviAteco } from "@/lib/ateco";
import { companies, impresaFonti } from "@/lib/db/schema";
import type { Database } from "@/lib/companies/repository";
import { normalizzaComune, riconosciComuneInTesta } from "@/lib/geo";

import { prioritaDi, type ImpresaImport } from "./schema";

/**
 * Fusione di un'impresa importata con quella già in archivio.
 *
 * Tre regole, in quest'ordine:
 *
 * 1. **un campo valorizzato non viene mai sovrascritto da un campo vuoto** —
 *    è l'errore che rovina un archivio costruito da più elenchi, perché la
 *    fonte più povera cancellerebbe il lavoro di quella più ricca;
 * 2. a parità di campo vince la fonte con priorità più alta;
 * 3. a parità di priorità vince il dato acquisito più di recente.
 */

/** I campi di `companies` che l'importazione può scrivere. */
const CAMPI = [
  "codiceFiscale",
  "denominazione",
  "formaGiuridica",
  "statoAttivita",
  "dataCostituzione",
  "reaNumero",
  "reaCciaa",
  "capitaleSociale",
  "atecoPrimario",
  "atecoVersione",
  "atecoPrimarioDescrizione",
  "sede",
  "codiceSdi",
  "dipendenti",
] as const;

type Campo = (typeof CAMPI)[number];

type Provenienza = { fonte: string; priorita: number; acquisitoIl: Date };

export type EsitoApplicazione = "inserita" | "aggiornata" | "invariata";

/** Vuoto significa: assente, stringa vuota, oppure oggetto senza contenuto. */
function vuoto(valore: unknown): boolean {
  if (valore === null || valore === undefined) return true;
  if (typeof valore === "string") return valore.trim() === "";
  if (typeof valore === "object") {
    return Object.values(valore as Record<string, unknown>).every(
      (interno) => interno === null || interno === undefined || interno === "",
    );
  }
  return false;
}

/** Decide se il nuovo valore deve prendere il posto di quello in archivio. */
export function deveSostituire(
  valoreNuovo: unknown,
  valoreVecchio: unknown,
  nuova: Provenienza,
  vecchia: Provenienza | undefined,
): boolean {
  // regola 1: mai cancellare un dato con il nulla
  if (vuoto(valoreNuovo)) return false;
  if (vuoto(valoreVecchio)) return true;
  if (!vecchia) return true;

  // regola 2: vince la fonte più affidabile
  if (nuova.priorita !== vecchia.priorita) return nuova.priorita > vecchia.priorita;

  // regola 3: a parità, vince il dato più fresco
  return nuova.acquisitoIl.getTime() > vecchia.acquisitoIl.getTime();
}

/** Porta l'impresa importata nella forma delle colonne di `companies`. */
export function inColonne(impresa: ImpresaImport): Record<Campo, unknown> {
  const grezzo = impresa.indirizzo;

  const riconosciuto = grezzo?.comune
    ? (normalizzaComune(grezzo.comune, grezzo.provincia) ??
      riconosciComuneInTesta(grezzo.comune, grezzo.provincia))
    : null;

  const via = [grezzo?.via, grezzo?.civico].filter(Boolean).join(" ").trim();

  const sede = riconosciuto
    ? {
        via: via || null,
        cap: grezzo?.cap ?? riconosciuto.cap,
        comune: riconosciuto.comune,
        provincia: riconosciuto.sigla,
        nazione: "IT",
      }
    : grezzo?.comune
      ? {
          via: via || null,
          cap: grezzo.cap ?? null,
          comune: grezzo.comune,
          provincia: grezzo.provincia ?? null,
          nazione: "IT",
        }
      : null;

  const rea = impresa.rea?.split("-") ?? [];
  const risolto = impresa.ateco
    ? descriviAteco(impresa.ateco.codice, impresa.ateco.versione ?? undefined)
    : null;

  return {
    codiceFiscale: impresa.codiceFiscale ?? null,
    denominazione: impresa.denominazione,
    formaGiuridica: impresa.formaGiuridica ?? null,
    statoAttivita: impresa.statoAttivita ?? null,
    dataCostituzione: impresa.dataCostituzione ?? null,
    reaNumero: (rea.length > 1 ? rea[1] : rea[0])?.trim() || null,
    reaCciaa: rea.length > 1 ? rea[0]?.trim() || null : null,
    capitaleSociale:
      impresa.capitaleSociale === null || impresa.capitaleSociale === undefined
        ? null
        : impresa.capitaleSociale.toFixed(2),
    atecoPrimario: impresa.ateco?.codice ?? null,
    atecoVersione: impresa.ateco?.versione ?? null,
    // la descrizione risolta sui dati Istat batte quella dell'elenco
    atecoPrimarioDescrizione:
      risolto?.descrizione ?? impresa.ateco?.descrizione ?? null,
    sede,
    codiceSdi: null,
    dipendenti: impresa.dipendenti ?? null,
  };
}

/**
 * Applica un blocco di imprese all'archivio.
 *
 * Idempotente per costruzione: reimportare lo stesso file non cambia nulla,
 * perché ogni campo viene riscritto solo se `deveSostituire` lo consente, e
 * la riga viene toccata solo se almeno un campo è cambiato davvero.
 */
export async function applicaBlocco(
  db: Database,
  imprese: ImpresaImport[],
  adesso: Date = new Date(),
): Promise<Record<EsitoApplicazione, number>> {
  const conteggio: Record<EsitoApplicazione, number> = {
    inserita: 0,
    aggiornata: 0,
    invariata: 0,
  };

  if (imprese.length === 0) return conteggio;

  const partiteIva = [...new Set(imprese.map((impresa) => impresa.partitaIva))];

  const esistenti = new Map(
    (
      await db
        .select()
        .from(companies)
        .where(inArray(companies.partitaIva, partiteIva))
    ).map((riga) => [riga.partitaIva, riga as Record<string, unknown>]),
  );

  const provenienze = new Map<string, Provenienza>();
  const righeFonti = await db
    .select()
    .from(impresaFonti)
    .where(inArray(impresaFonti.partitaIva, partiteIva));

  for (const riga of righeFonti) {
    provenienze.set(`${riga.partitaIva}|${riga.campo}`, {
      fonte: riga.fonte,
      priorita: riga.priorita,
      acquisitoIl: riga.acquisitoIl,
    });
  }

  for (const impresa of imprese) {
    const nuova: Provenienza = {
      fonte: impresa.fonte,
      priorita: prioritaDi(impresa.fonte),
      acquisitoIl: new Date(impresa.dataAcquisizione),
    };

    const proposti = inColonne(impresa);
    const esistente = esistenti.get(impresa.partitaIva);

    const daScrivere: Record<string, unknown> = {};
    const campiVinti: Campo[] = [];

    for (const campo of CAMPI) {
      const valoreNuovo = proposti[campo];
      const valoreVecchio = esistente?.[campo];
      const vecchia = provenienze.get(`${impresa.partitaIva}|${campo}`);

      if (!deveSostituire(valoreNuovo, valoreVecchio, nuova, vecchia)) continue;

      // se il valore è identico non c'è nulla da aggiornare
      if (JSON.stringify(valoreNuovo) === JSON.stringify(valoreVecchio ?? null)) {
        continue;
      }

      daScrivere[campo] = valoreNuovo;
      campiVinti.push(campo);
    }

    if (!esistente) {
      await db.insert(companies).values({
        partitaIva: impresa.partitaIva,
        denominazione: impresa.denominazione,
        ...daScrivere,
        providerName: impresa.fonte,
        fetchedAt: nuova.acquisitoIl,
        createdAt: adesso,
        updatedAt: adesso,
      } as typeof companies.$inferInsert);
      conteggio.inserita += 1;
    } else if (campiVinti.length > 0) {
      await db
        .update(companies)
        .set({ ...daScrivere, updatedAt: adesso })
        .where(eq(companies.partitaIva, impresa.partitaIva));
      conteggio.aggiornata += 1;
    } else {
      conteggio.invariata += 1;
    }

    for (const campo of campiVinti) {
      await db
        .insert(impresaFonti)
        .values({
          partitaIva: impresa.partitaIva,
          campo,
          fonte: nuova.fonte,
          priorita: nuova.priorita,
          acquisitoIl: nuova.acquisitoIl,
          aggiornatoIl: adesso,
        })
        .onConflictDoUpdate({
          target: [impresaFonti.partitaIva, impresaFonti.campo],
          set: {
            fonte: nuova.fonte,
            priorita: nuova.priorita,
            acquisitoIl: nuova.acquisitoIl,
            aggiornatoIl: adesso,
          },
        });
    }
  }

  return conteggio;
}
