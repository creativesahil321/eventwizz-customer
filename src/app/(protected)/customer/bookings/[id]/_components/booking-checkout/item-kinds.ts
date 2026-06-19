import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Ticket,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LineItemKind = "table" | "ticket" | "package" | "addon";

/** Lovable line-item icons (fork/knife, ticket, sparkle, wine glass) */
export const LOVABLE_KIND_ICONS: Record<LineItemKind, LucideIcon> = {
  table: UtensilsCrossed,
  ticket: Ticket,
  package: Sparkles,
  addon: Wine,
};

export const LOVABLE_KIND_ICON_STROKE = 2;

const KIND_CONFIG: Record<
  LineItemKind,
  { cssVar: string; label: string; sectionTitle: string }
> = {
  table: {
    cssVar: "var(--booking-kind-table)",
    label: "Table",
    sectionTitle: "Table Seating",
  },
  ticket: {
    cssVar: "var(--booking-kind-ticket)",
    label: "Ticket",
    sectionTitle: "Tickets",
  },
  package: {
    cssVar: "var(--booking-kind-package)",
    label: "Package",
    sectionTitle: "Drink Packages",
  },
  addon: {
    cssVar: "var(--booking-kind-addon)",
    label: "Add-on",
    sectionTitle: "Add-ons",
  },
};

export function kindTint(cssVar: string, strength: number, base = "var(--card)") {
  return `color-mix(in srgb, ${cssVar} ${strength}%, ${base})`;
}

export function getKindStyles(kind: LineItemKind) {
  const config = KIND_CONFIG[kind];
  return {
    cssVar: config.cssVar,
    label: config.label,
    sectionTitle: config.sectionTitle,
    icon: LOVABLE_KIND_ICONS[kind],
    iconClassName: "h-[18px] w-[18px] shrink-0",
    iconStrokeWidth: LOVABLE_KIND_ICON_STROKE,
    chipClassName: cn(
      "booking-kind-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
    ),
    chipSmClassName: cn(
      "booking-kind-chip booking-kind-chip--sm flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
    ),
    iconSmClassName: "h-3.5 w-3.5 shrink-0",
    badgeClassName: cn(
      "booking-kind-badge rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
    ),
    sectionClassName: "booking-kind-section-title",
  };
}

/** Accent custom property for catalog cards / steppers in add-extras */
export function kindAccentStyle(kind: LineItemKind): CSSProperties {
  return { "--kind-accent": getKindStyles(kind).cssVar } as CSSProperties;
}

export function getKindAllocationPillStyle(): CSSProperties {
  const cssVar = "var(--booking-kind-table)";
  return {
    backgroundColor: kindTint(cssVar, 10),
    borderColor: kindTint(cssVar, 22, "var(--border)"),
    color: cssVar,
  };
}
