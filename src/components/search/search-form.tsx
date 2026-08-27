"use client";

import { ArrowRight, CircleAlert, CircleCheck, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { analyzeQuery, QUERY_KIND_TEXT } from "@/lib/validation";
import { cn } from "@/lib/utils";

const ESEMPI = [
  { q: "00743110157", label: "00743110157", hint: "Partita IVA" },
  { q: "Ferrari", label: "Ferrari", hint: "Ragione sociale" },
  { q: "MRTMTT25D09F205Z", label: "MRTMTT25D09F205Z", hint: "Codice fiscale" },
] as const;

export function SearchForm({
  defaultValue = "",
  autoFocus = false,
  size = "hero",
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  size?: "hero" | "compact";
}) {
  const router = useRouter();
  const { recent, push, clear } = useRecentSearches();
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const feedbackId = useId();

  // La validazione della P.IVA avviene qui, prima di qualsiasi chiamata di rete
  const analysis = useMemo(() => analyzeQuery(value), [value]);
  const isEmpty = value.trim().length === 0;
  // Per P.IVA e codice fiscale il riscontro è immediato: quei formati hanno
  // lunghezza fissa, quindi il messaggio compare solo quando il numero è
  // completo e non mentre l'utente sta ancora digitando. Per una ragione
  // sociale, invece, non c'è nulla da validare finché non si esce dal campo.
  const showFeedback = !isEmpty && (touched || analysis.kind !== "denominazione");

  function submit(query: string) {
    const result = analyzeQuery(query);
    if (!result.isValid) {
      setValue(query);
      setTouched(true);
      return;
    }
    push(result.value);
    router.push(`/ricerca?q=${encodeURIComponent(result.value)}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (isEmpty) return;
    submit(value);
  }

  const hero = size === "hero";

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className={cn(
                "text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2",
                hero ? "size-4.5" : "size-4",
              )}
              aria-hidden
            />
            <Input
              type="search"
              name="q"
              value={value}
              autoFocus={autoFocus}
              autoComplete="off"
              enterKeyHint="search"
              spellCheck={false}
              onChange={(event) => setValue(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="P.IVA, codice fiscale o ragione sociale"
              aria-label="Cerca un'azienda per Partita IVA, codice fiscale o ragione sociale"
              aria-invalid={showFeedback && !analysis.isValid}
              aria-describedby={showFeedback ? feedbackId : undefined}
              className={cn(
                "num shadow-card",
                hero ? "h-13 pl-11 text-base" : "h-11 pl-10",
              )}
            />
          </div>
          <Button
            type="submit"
            size={hero ? "lg" : "default"}
            className={cn(hero ? "h-13 px-7 text-base" : "h-11 px-5")}
          >
            Cerca
            <ArrowRight aria-hidden />
          </Button>
        </div>

        {/* Riservare lo spazio del messaggio evita che il layout salti */}
        <div className="min-h-9 pt-2.5" aria-live="polite" id={feedbackId}>
          {showFeedback &&
            (analysis.isValid ? (
              <p className="text-success flex items-center gap-1.5 text-sm">
                <CircleCheck className="size-3.5 shrink-0" aria-hidden />
                {QUERY_KIND_TEXT[analysis.kind].recognized}
              </p>
            ) : (
              <p className="text-danger flex items-center gap-1.5 text-sm">
                <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                {analysis.error}
              </p>
            ))}
        </div>
      </form>

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <span>Prova con:</span>
        {ESEMPI.map((esempio) => (
          <button
            key={esempio.q}
            type="button"
            onClick={() => submit(esempio.q)}
            aria-label={`Cerca ${esempio.label} — ${esempio.hint}`}
            className="num border-border bg-card text-foreground ease-ui hover:border-primary/40 hover:bg-muted rounded-none border px-2.5 py-1 text-xs transition-colors duration-150"
          >
            {esempio.label}
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span>Ricerche recenti:</span>
          {recent.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => submit(item)}
              className="num border-border bg-card text-foreground ease-ui hover:border-primary/40 hover:bg-muted rounded-none border px-2.5 py-1 text-xs transition-colors duration-150"
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={clear}
            className="ease-ui hover:text-foreground flex items-center gap-1 rounded-none px-1.5 py-1 text-xs transition-colors duration-150"
          >
            <X className="size-3" aria-hidden />
            Cancella
          </button>
        </div>
      )}
    </div>
  );
}
