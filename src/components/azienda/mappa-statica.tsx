/**
 * Mappa della sede legale via embed ufficiale OpenStreetMap.
 *
 * Usa l'iframe di openstreetmap.org — supportato esplicitamente da OSM per
 * l'incorporazione gratuita, senza API key, senza rate limit sulle tile.
 * La didascalia dichiara che il punto è il comune, non il civico.
 */
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
  // bbox centrata sul punto: ±0.01° in lat, ±0.015° in lon a zoom 14
  const delta = 0.008;
  const bbox = `${lon - delta * 1.5},${lat - delta},${lon + delta * 1.5},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;

  return (
    <figure className="m-0">
      <div className="border-border bg-muted relative overflow-hidden border" style={{ height: 260 }}>
        <iframe
          src={src}
          title={`Mappa della sede di ${etichetta}`}
          width="100%"
          height="260"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <figcaption className="text-muted-foreground mt-2 text-xs">
        {esatta
          ? `Sede legale: ${etichetta}. Dati © `
          : `Mappa centrata su ${etichetta}. La posizione indicata è quella del comune, non del numero civico. Dati © `}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          OpenStreetMap contributors
        </a>
        .
      </figcaption>
    </figure>
  );
}
