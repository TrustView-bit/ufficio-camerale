import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

import type { ClienteModello } from "./genera";

/** Il cliente reale. Esiste solo se ANTHROPIC_API_KEY è configurata. */
export function clienteAnthropic(): ClienteModello | null {
  if (!env.ANTHROPIC_API_KEY) return null;

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  return {
    modello: env.ANTHROPIC_MODEL,

    async scrivi(sistema, utente) {
      const risposta = await anthropic.messages.create({
        model: env.ANTHROPIC_MODEL,
        // 700 caratteri di descrizione stanno abbondantemente qui dentro
        max_tokens: 500,
        // testo informativo, non creativo: si vuole la lettura più probabile
        temperature: 0.2,
        system: sistema,
        messages: [{ role: "user", content: utente }],
      });

      const testo = risposta.content
        .filter((blocco) => blocco.type === "text")
        .map((blocco) => blocco.text)
        .join("")
        .trim();

      return testo || null;
    },
  };
}
