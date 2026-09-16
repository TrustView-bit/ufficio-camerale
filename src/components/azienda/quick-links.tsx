"use client";

import {
  Check,
  Copy,
  Globe,
  Mail,
  MapPin,
  Phone,
  Printer,
  Share2,
  Users,
} from "lucide-react";
import { useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { formatIndirizzo, toSitoHref, toTelHref } from "@/lib/format";
import type { CompanyData } from "@/lib/providers/types";

type Azione =
  | {
      kind: "link";
      label: string;
      href: string;
      icon: ComponentType<{ className?: string }>;
    }
  | {
      kind: "button";
      label: string;
      onClick: () => void;
      icon: ComponentType<{ className?: string }>;
    };

/**
 * Le azioni che un utente compie davvero su una scheda azienda: scrivere,
 * telefonare, aprire la mappa, copiare la Partita IVA. Restano raggiungibili
 * con un pollice sopra la piega.
 */
export function QuickLinks({ company }: { company: CompanyData }) {
  const [copiato, setCopiato] = useState(false);

  const sito = toSitoHref(company.sitoWeb);
  const tel = toTelHref(company.telefono);
  const indirizzo = formatIndirizzo(company.sede);

  async function copiaPartitaIva() {
    try {
      await navigator.clipboard.writeText(company.partitaIva);
      setCopiato(true);
      window.setTimeout(() => setCopiato(false), 2000);
    } catch {
      // niente appunti disponibili: il numero resta comunque selezionabile
    }
  }

  async function condividi() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: company.denominazione, url });
        return;
      } catch {
        // condivisione annullata dall'utente
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // nulla da fare: l'indirizzo è comunque nella barra del browser
    }
  }

  const azioni: Azione[] = [];

  if (sito) {
    azioni.push({ kind: "link", label: "Sito web", href: sito, icon: Globe });
  }
  if (company.pec) {
    azioni.push({
      kind: "link",
      label: "PEC",
      href: `mailto:${company.pec}`,
      icon: Mail,
    });
  }
  if (tel) {
    azioni.push({ kind: "link", label: "Telefono", href: tel, icon: Phone });
  }
  if (indirizzo) {
    azioni.push({
      kind: "link",
      label: "Mappa",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${company.denominazione} ${indirizzo}`,
      )}`,
      icon: MapPin,
    });
  }
  azioni.push({
    kind: "link",
    label: "Cerca su LinkedIn",
    href: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
      company.denominazione,
    )}`,
    // lucide non distribuisce più le icone dei marchi: icona neutra
    icon: Users,
  });
  azioni.push({
    kind: "button",
    label: "Condividi",
    onClick: condividi,
    icon: Share2,
  });
  azioni.push({
    kind: "button",
    label: "Stampa o PDF",
    onClick: () => window.print(),
    icon: Printer,
  });

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={copiaPartitaIva}
        aria-label={`Copia la Partita IVA ${company.partitaIva}`}
      >
        {copiato ? (
          <Check className="text-success" aria-hidden />
        ) : (
          <Copy aria-hidden />
        )}
        {copiato ? "Copiata" : "Copia P.IVA"}
      </Button>

      {azioni.map((azione) =>
        azione.kind === "link" ? (
          <Button key={azione.label} variant="outline" size="sm" asChild>
            <a
              href={azione.href}
              {...(azione.href.startsWith("http")
                ? // sito, mappa e ricerca LinkedIn sono link generati in massa
                  // verso terzi, non editoriali: nofollow, come raccomanda
                  // Google per questo genere di collegamenti
                  { target: "_blank", rel: "nofollow noopener noreferrer" }
                : {})}
            >
              <azione.icon aria-hidden />
              {azione.label}
            </a>
          </Button>
        ) : (
          <Button
            key={azione.label}
            variant="outline"
            size="sm"
            onClick={azione.onClick}
          >
            <azione.icon aria-hidden />
            {azione.label}
          </Button>
        ),
      )}
    </div>
  );
}
