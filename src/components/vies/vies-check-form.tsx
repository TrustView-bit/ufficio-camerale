"use client";

import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  RotateCw,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  VIES_UNAVAILABLE_MESSAGE,
  type ViesResult,
  type ViesUnavailableReason,
} from "@/lib/providers/vies";
import { analyzeQuery, formatPartitaIva } from "@/lib/validation";

type State =
  | { phase: "idle" }
  | { phase: "loading"; piva: string }
  | { phase: "done"; piva: string; result: ViesResult };

/** Interroga la nostra Route Handler; non lancia mai. */
async function fetchVies(piva: string): Promise<ViesResult> {
  try {
    const response = await fetch(`/api/vies?piva=${encodeURIComponent(piva)}`);
    return (await response.json()) as ViesResult;
  } catch {
    return { status: "unavailable", reason: "NETWORK" };
  }
}

export function ViesCheckForm({ defaultValue = "" }: { defaultValue?: string }) {
  // Arrivando da /ricerca la P.IVA è già nell'URL: la verifica parte da sola
  const initialPiva = useMemo(() => {
    const initial = analyzeQuery(defaultValue);
    return initial.kind === "partita-iva" && initial.isValid ? initial.value : null;
  }, [defaultValue]);

  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<State>(() =>
    initialPiva ? { phase: "loading", piva: initialPiva } : { phase: "idle" },
  );
  const feedbackId = useId();
  // Una risposta lenta non deve sovrascrivere una richiesta più recente
  const requestId = useRef(0);

  const analysis = analyzeQuery(value);
  const isPartitaIva = analysis.kind === "partita-iva";
  const canSubmit = isPartitaIva && analysis.isValid;
  const showFeedback = value.trim().length > 0 && (touched || isPartitaIva);

  const run = useCallback(async (piva: string) => {
    const id = ++requestId.current;
    setState({ phase: "loading", piva });

    const result = await fetchVies(piva);
    if (id === requestId.current) setState({ phase: "done", piva, result });
  }, []);

  useEffect(() => {
    if (!initialPiva) return;

    const id = ++requestId.current;
    void fetchVies(initialPiva).then((result) => {
      if (id === requestId.current) {
        setState({ phase: "done", piva: initialPiva, result });
      }
    });
  }, [initialPiva]);

  return (
    <div>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (canSubmit) void run(analysis.value);
        }}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            type="search"
            name="piva"
            value={value}
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="search"
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Partita IVA — 11 cifre"
            aria-label="Partita IVA da verificare su VIES"
            aria-invalid={showFeedback && !canSubmit}
            aria-describedby={showFeedback ? feedbackId : undefined}
            className="num shadow-card h-13 flex-1 text-base"
          />
          <Button
            type="submit"
            size="lg"
            className="h-13 px-7 text-base"
            disabled={state.phase === "loading"}
          >
            Verifica
            <ArrowRight aria-hidden />
          </Button>
        </div>

        <div className="min-h-9 pt-2.5" aria-live="polite" id={feedbackId}>
          {showFeedback &&
            (canSubmit ? (
              <p className="text-success flex items-center gap-1.5 text-sm">
                <CircleCheck className="size-3.5 shrink-0" aria-hidden />
                Formato corretto: la cifra di controllo torna
              </p>
            ) : (
              <p className="text-danger flex items-center gap-1.5 text-sm">
                <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                {isPartitaIva
                  ? analysis.error
                  : "Servono esattamente 11 cifre: VIES verifica solo le partite IVA."}
              </p>
            ))}
        </div>
      </form>

      <div className="mt-2" aria-live="polite">
        {state.phase === "loading" && <ResultSkeleton />}
        {state.phase === "done" && (
          <ResultCard
            result={state.result}
            piva={state.piva}
            onRetry={() => void run(state.piva)}
          />
        )}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <Card className="shadow-card max-w-2xl">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

function ResultCard({
  result,
  piva,
  onRetry,
}: {
  result: ViesResult;
  piva: string;
  onRetry: () => void;
}) {
  if (result.status === "unavailable") {
    const reason: ViesUnavailableReason = result.reason;
    return (
      <Card className="border-warning/25 bg-warning-subtle/40 shadow-card max-w-2xl">
        <CardHeader>
          <CardTitle className="text-warning flex items-center gap-2 text-base">
            <TriangleAlert className="size-4" aria-hidden />
            VIES non ha potuto rispondere
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm">
          <p>{VIES_UNAVAILABLE_MESSAGE[reason]}</p>
          <p>
            Attenzione: questo <strong className="font-medium">non</strong>{" "}
            significa che la Partita IVA{" "}
            <span className="num text-foreground">{formatPartitaIva(piva)}</span>{" "}
            non esista. Il servizio non ha risposto, non ha risposto di no.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden />
            Riprova
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result.status === "invalid" || result.status === "invalid-input") {
    return (
      <Card className="border-danger/25 bg-danger-subtle/40 shadow-card max-w-2xl">
        <CardHeader>
          <CardTitle className="text-danger flex items-center gap-2 text-base">
            <CircleSlash className="size-4" aria-hidden />
            Partita IVA non registrata
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          VIES non riconosce la Partita IVA{" "}
          <span className="num text-foreground">
            {formatPartitaIva(piva, true)}
          </span>
          . Può non essere mai esistita, oppure essere stata cessata: VIES riporta
          soltanto le partite attive negli scambi intracomunitari.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-success/25 shadow-card max-w-2xl">
      <CardHeader>
        <CardTitle className="text-success flex items-center gap-2 text-base">
          <CircleCheck className="size-4" aria-hidden />
          Partita IVA valida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Partita IVA</dt>
          <dd className="num font-medium">
            {formatPartitaIva(result.vatNumber, true)}
          </dd>

          {result.name && (
            <>
              <dt className="text-muted-foreground">Denominazione</dt>
              <dd className="font-medium">{result.name}</dd>
            </>
          )}

          {result.address && (
            <>
              <dt className="text-muted-foreground">Indirizzo</dt>
              <dd className="whitespace-pre-line">{result.address}</dd>
            </>
          )}
        </dl>

        {!result.name && (
          <p className="text-muted-foreground">
            L&apos;anagrafe italiana non divulga denominazione e indirizzo tramite
            VIES: risulta soltanto che la partita è attiva.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
