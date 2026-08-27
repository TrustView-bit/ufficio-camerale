import type { Bilancio } from "@/lib/providers/types";

/**
 * Andamento del fatturato, un esercizio per barra.
 *
 * Una serie sola, quindi nessuna legenda: il titolo dice già di cosa si
 * tratta. Il valore compare per esteso solo sull'ultimo esercizio e sul
 * massimo — metterlo su ogni barra affollerebbe senza aggiungere nulla, e
 * l'elenco «Fatturato per anno» qui sopra riporta comunque tutte le cifre.
 *
 * Nessun JavaScript: è un SVG servito dal server, con un `<title>` per barra
 * che il browser mostra al passaggio del mouse e gli assistenti vocali leggono.
 */

/**
 * Il riquadro ha unità proprie e scala in modo uniforme: usare
 * `preserveAspectRatio="none"` per riempire la larghezza deformerebbe il
 * testo, e le etichette degli anni diventerebbero illeggibili.
 */
const LARGHEZZA = 600;
const ALTEZZA = 150;
const SPAZIO_SOPRA = 20;
const SPAZIO_ETICHETTE = 24;

const EURO_COMPATTO = new Intl.NumberFormat("it-IT", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const EURO_ESTESO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function AndamentoFatturato({ bilanci }: { bilanci: Bilancio[] }) {
  const serie = bilanci
    .filter(
      (bilancio): bilancio is Bilancio & { fatturato: number } =>
        typeof bilancio.fatturato === "number" && bilancio.fatturato > 0,
    )
    .sort((a, b) => a.anno - b.anno)
    .slice(-8);

  // con meno di due esercizi non c'è un andamento da mostrare
  if (serie.length < 2) return null;

  const massimo = Math.max(...serie.map((bilancio) => bilancio.fatturato));
  const annoMassimo = serie.find((b) => b.fatturato === massimo)!.anno;
  const ultimo = serie[serie.length - 1]!;

  const larghezzaBarra = LARGHEZZA / serie.length;
  // respiro fra una barra e l'altra, perché non si tocchino mai
  const gap = Math.min(14, larghezzaBarra * 0.22);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${LARGHEZZA} ${SPAZIO_SOPRA + ALTEZZA + SPAZIO_ETICHETTE}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Andamento del fatturato dal ${serie[0]!.anno} al ${ultimo.anno}`}
      >
        {/* riferimento orizzontale, volutamente poco visibile */}
        <line
          x1="0"
          y1={SPAZIO_SOPRA + ALTEZZA}
          x2={LARGHEZZA}
          y2={SPAZIO_SOPRA + ALTEZZA}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {serie.map((bilancio, indice) => {
          const altezza = Math.max(2, (bilancio.fatturato / massimo) * ALTEZZA);
          const x = indice * larghezzaBarra + gap / 2;
          const larghezza = larghezzaBarra - gap;
          const inRilievo =
            bilancio.anno === ultimo.anno || bilancio.anno === annoMassimo;

          return (
            <g key={bilancio.anno}>
              <rect
                x={x}
                y={SPAZIO_SOPRA + ALTEZZA - altezza}
                width={larghezza}
                height={altezza}
                rx="4"
                fill="var(--chart-1)"
                opacity={inRilievo ? 1 : 0.68}
              >
                <title>
                  {`${bilancio.anno}: ${EURO_ESTESO.format(bilancio.fatturato)}`}
                </title>
              </rect>

              {inRilievo && (
                <text
                  x={x + larghezza / 2}
                  y={SPAZIO_SOPRA + ALTEZZA - altezza - 7}
                  textAnchor="middle"
                  className="fill-foreground"
                  style={{ fontSize: 15, fontWeight: 600 }}
                >
                  {EURO_COMPATTO.format(bilancio.fatturato)}
                </text>
              )}

              <text
                x={x + larghezza / 2}
                y={SPAZIO_SOPRA + ALTEZZA + 17}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 14 }}
              >
                {bilancio.anno}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="text-muted-foreground mt-1 text-xs">
        Fatturato per esercizio, in euro. Le cifre esatte di ogni anno sono
        nell&apos;elenco qui sopra.
      </figcaption>
    </figure>
  );
}
