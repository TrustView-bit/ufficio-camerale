import { MapPin } from "lucide-react";

/**
 * Mappa statica composta dalle tile di OpenStreetMap.
 *
 * Nessuna libreria, nessun iframe, nessun JavaScript: solo immagini
 * posizionate. Pesa quanto le tile che servono a coprire il riquadro.
 *
 * Le coordinate sono quelle del centro del comune, non del civico: per
 * puntare l'indirizzo esatto servirebbe un servizio di geocodifica, e la
 * didascalia lo dichiara invece di lasciarlo intendere.
 *
 * Nota per la produzione: le tile pubbliche di openstreetmap.org hanno una
 * politica d'uso che scoraggia il traffico elevato. Prima di mettere il sito
 * sotto carico vero conviene passare a un fornitore di tile proprio.
 */

const TILE = 256;
/** Riquadro logico: su schermi stretti viene ritagliato ai lati. */
const LARGHEZZA = 900;
const ALTEZZA = 260;

function coordinateInPixel(lat: number, lon: number, zoom: number) {
  const scala = TILE * 2 ** zoom;
  const x = ((lon + 180) / 360) * scala;

  const senoLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + senoLat) / (1 - senoLat)) / (4 * Math.PI)) * scala;

  return { x, y, scala };
}

export function MappaStatica({
  lat,
  lon,
  etichetta,
  zoom = 14,
  esatta = false,
}: {
  lat: number;
  lon: number;
  etichetta: string;
  zoom?: number;
  /** true quando il punto è la sede, non il centro del comune. */
  esatta?: boolean;
}) {
  const { x, y } = coordinateInPixel(lat, lon, zoom);

  const sinistra = x - LARGHEZZA / 2;
  const alto = y - ALTEZZA / 2;

  const primaColonna = Math.floor(sinistra / TILE);
  const ultimaColonna = Math.floor((sinistra + LARGHEZZA) / TILE);
  const primaRiga = Math.floor(alto / TILE);
  const ultimaRiga = Math.floor((alto + ALTEZZA) / TILE);

  const massimo = 2 ** zoom;
  const tiles: { key: string; src: string; left: number; top: number }[] = [];

  for (let tx = primaColonna; tx <= ultimaColonna; tx++) {
    for (let ty = primaRiga; ty <= ultimaRiga; ty++) {
      // fuori dai poli non esistono tile; in longitudine il mondo si ripete
      if (ty < 0 || ty >= massimo) continue;
      const txAvvolto = ((tx % massimo) + massimo) % massimo;

      tiles.push({
        key: `${tx}-${ty}`,
        src: `https://tile.openstreetmap.org/${zoom}/${txAvvolto}/${ty}.png`,
        left: tx * TILE - sinistra,
        top: ty * TILE - alto,
      });
    }
  }

  return (
    <figure className="m-0">
      <div
        className="border-border bg-muted relative overflow-hidden border"
        style={{ height: ALTEZZA }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{ width: LARGHEZZA, height: ALTEZZA }}
        >
          {tiles.map((tile) => (
            /* eslint-disable-next-line @next/next/no-img-element --
               next/image non serve: le tile sono già 256×256 e immutabili */
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              width={TILE}
              height={TILE}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute max-w-none"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}

          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"
            aria-hidden
          >
            <MapPin
              className="text-danger size-8 drop-shadow-md"
              strokeWidth={2.5}
            />
          </span>
        </div>

        <span className="text-muted-foreground bg-background/85 absolute right-0 bottom-0 rounded-tl-md px-2 py-0.5 text-[11px]">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            OpenStreetMap
          </a>
        </span>
      </div>

      <figcaption className="text-muted-foreground mt-2 text-xs">
        {esatta
          ? `Sede legale: ${etichetta}.`
          : `Mappa centrata su ${etichetta}. La posizione indicata è quella del comune, non del numero civico.`}
      </figcaption>
    </figure>
  );
}
