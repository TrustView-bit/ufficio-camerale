import { ImageResponse } from "next/og";

import { lookupCompany } from "@/lib/companies";
import { formatIndirizzo } from "@/lib/format";
import { parsePartitaIvaFromSlug } from "@/lib/slug";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Scheda azienda su Ufficio Camerale";

/**
 * L'anteprima mostrata quando la scheda viene condivisa.
 *
 * ImageResponse non capisce oklch né le variabili CSS del sito, quindi la
 * palette è ripetuta qui in esadecimale: sono gli stessi colori dei token.
 */
const COLORI = {
  fondo: "#fbfaf7",
  inchiostro: "#282d3d",
  tenue: "#6b7185",
  blu: "#2c4c9b",
  bordo: "#e3e2df",
  attiva: "#1f7a5c",
  liquidazione: "#8a5a12",
  cessata: "#6b7185",
} as const;

const ETICHETTA_STATO = {
  attiva: { testo: "Attiva", colore: COLORI.attiva },
  inattiva: { testo: "Inattiva", colore: COLORI.cessata },
  "in-liquidazione": { testo: "In liquidazione", colore: COLORI.liquidazione },
  cessata: { testo: "Cessata", colore: COLORI.cessata },
  sconosciuto: null,
} as const;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partitaIva = parsePartitaIvaFromSlug(slug);
  const result = partitaIva ? await lookupCompany(partitaIva) : null;

  const company = result?.status === "found" ? result.company : null;
  const stato = company ? ETICHETTA_STATO[company.statoAttivita] : null;
  const luogo = company ? formatIndirizzo(company.sede) : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: COLORI.fondo,
        color: COLORI.inchiostro,
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: COLORI.blu,
          }}
        />
        <div style={{ fontSize: 26, fontWeight: 600 }}>Ufficio Camerale</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: company && company.denominazione.length > 44 ? 58 : 72,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -1.5,
          }}
        >
          {company?.denominazione ?? "Azienda non trovata"}
        </div>

        {company && (
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 30, color: COLORI.tenue }}>
              {/* Satori vuole un solo figlio per nodo, o un display esplicito */}
              {`P.IVA ${company.partitaIva}`}
            </div>
            {stato && (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: stato.colore,
                  border: `2px solid ${stato.colore}33`,
                  borderRadius: 999,
                  padding: "6px 18px",
                }}
              >
                {stato.testo}
              </div>
            )}
          </div>
        )}

        {luogo && <div style={{ fontSize: 28, color: COLORI.tenue }}>{luogo}</div>}
      </div>

      <div
        style={{
          fontSize: 22,
          color: COLORI.tenue,
          borderTop: `2px solid ${COLORI.bordo}`,
          paddingTop: 24,
        }}
      >
        Dati camerali da fonti pubbliche · servizio indipendente
      </div>
    </div>,
    size,
  );
}
