import type { Metadata } from "next";

import { PaginaInPreparazione } from "@/components/pagina-in-preparazione";

export const metadata: Metadata = { title: "Verifica Partita IVA" };

export default function Page() {
  return (
    <PaginaInPreparazione
      titolo="Verifica Partita IVA"
      descrizione="Lo strumento di verifica su VIES, il servizio della Commissione europea che conferma l'esistenza di una Partita IVA comunitaria, arriva al prossimo step. Nel frattempo il controllo formale della cifra di controllo funziona già dalla ricerca."
    />
  );
}
