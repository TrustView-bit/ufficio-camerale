import { CircleDot, CircleSlash, TriangleAlert } from "lucide-react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Stato attività di un'impresa nel Registro Imprese. */
export type CompanyStatus = "attiva" | "cessata" | "in-liquidazione";

const STATUS: Record<
  CompanyStatus,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  attiva: {
    label: "Attiva",
    icon: CircleDot,
    className: "bg-success-subtle text-success border-success/25",
  },
  cessata: {
    label: "Cessata",
    icon: CircleSlash,
    className: "bg-neutral-subtle text-muted-foreground border-border",
  },
  "in-liquidazione": {
    label: "In liquidazione",
    icon: TriangleAlert,
    className: "bg-warning-subtle text-warning border-warning/25",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CompanyStatus;
  className?: string;
}) {
  const { label, icon: Icon, className: tone } = STATUS[status];

  return (
    <Badge variant="outline" className={cn("h-6 gap-1.5 px-2.5", tone, className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}
