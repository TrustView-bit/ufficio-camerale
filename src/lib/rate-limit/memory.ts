/** Esito di un controllo sul limite di richieste. */
export type RateLimitResult = {
  success: boolean;
  /** Richieste consentite nella finestra. */
  limit: number;
  /** Quante ne restano. */
  remaining: number;
  /** Quando la finestra si azzera, in millisecondi epoch. */
  reset: number;
};

export type RateLimitRule = {
  nome: string;
  /** Richieste consentite. */
  limite: number;
  /** Ampiezza della finestra in millisecondi. */
  finestraMs: number;
};

export interface RateLimiter {
  check(identificatore: string): Promise<RateLimitResult>;
}

/**
 * Contatore a finestra scorrevole tenuto in memoria.
 *
 * È il ripiego usato quando Upstash non è configurato. Vive nel singolo
 * processo: su più istanze serverless ognuna conta per conto suo, quindi il
 * limite reale è più alto di quello dichiarato. Va bene in sviluppo, non
 * protegge davvero in produzione.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly regole: RateLimitRule[],
    private readonly now: () => number = Date.now,
  ) {}

  async check(identificatore: string): Promise<RateLimitResult> {
    const adesso = this.now();
    const finestraPiuLunga = Math.max(...this.regole.map((r) => r.finestraMs));

    const precedenti = this.hits.get(identificatore) ?? [];
    // si conservano solo i colpi ancora rilevanti per la finestra più ampia
    const recenti = precedenti.filter((t) => t > adesso - finestraPiuLunga);

    let piuStretta: RateLimitResult | null = null;

    for (const regola of this.regole) {
      const nellaFinestra = recenti.filter((t) => t > adesso - regola.finestraMs);
      const usati = nellaFinestra.length;
      const rimanenti = Math.max(0, regola.limite - usati);

      const reset =
        nellaFinestra.length > 0
          ? nellaFinestra[0]! + regola.finestraMs
          : adesso + regola.finestraMs;

      const esito: RateLimitResult = {
        success: usati < regola.limite,
        limit: regola.limite,
        remaining: rimanenti,
        reset,
      };

      // vince la regola più restrittiva fra quelle configurate
      if (!esito.success) {
        this.hits.set(identificatore, recenti);
        return esito;
      }
      if (!piuStretta || esito.remaining < piuStretta.remaining) {
        piuStretta = esito;
      }
    }

    recenti.push(adesso);
    this.hits.set(identificatore, recenti);

    return {
      ...piuStretta!,
      remaining: Math.max(0, piuStretta!.remaining - 1),
    };
  }

  /** Solo per i test: dimentica tutto. */
  reset() {
    this.hits.clear();
  }
}
