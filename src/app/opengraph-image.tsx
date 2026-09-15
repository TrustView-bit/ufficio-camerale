import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Catalogo Imprese — verifica Partita IVA e dati aziendali";

/**
 * L'anteprima di default quando si condivide una pagina che non è una scheda
 * (le schede hanno la propria). Palette in esadecimale come nell'altra:
 * ImageResponse non legge oklch né le variabili CSS.
 */
const COLORI = {
  fondo: "#fbfaf7",
  inchiostro: "#282d3d",
  tenue: "#6b7185",
  blu: "#2c4c9b",
  bordo: "#e3e2df",
} as const;

export default function Image() {
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
        <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORI.blu }} />
        <div style={{ fontSize: 26, fontWeight: 600 }}>Catalogo Imprese</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }}>
          Verifica una Partita IVA, consulta l&apos;azienda dietro il numero.
        </div>
        <div style={{ fontSize: 30, color: COLORI.tenue }}>
          Anagrafica, sede, ATECO, REA, PEC e bilanci da fonti pubbliche
        </div>
      </div>

      <div
        style={{
          fontSize: 22,
          color: COLORI.tenue,
          borderTop: `2px solid ${COLORI.bordo}`,
          paddingTop: 24,
        }}
      >
        www.catalogoimprese.com
      </div>
    </div>,
    size,
  );
}
