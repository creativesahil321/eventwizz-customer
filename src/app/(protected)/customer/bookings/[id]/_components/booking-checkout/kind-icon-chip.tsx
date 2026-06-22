import { getKindStyles, kindAccentStyle, type LineItemKind } from "./item-kinds";
import { cn } from "@/lib/utils";

interface KindIconChipProps {
  kind: LineItemKind;
  size?: "md" | "sm";
  variant?: "row" | "section";
}

/** Lovable squircle icon chip — utensils, ticket, sparkles, wine */
export function KindIconChip({
  kind,
  size = "md",
  variant = "row",
}: KindIconChipProps) {
  const kindStyles = getKindStyles(kind);
  const Icon = kindStyles.icon;
  const compact = size === "sm";

  return (
    <div
      className={cn(
        compact ? kindStyles.chipSmClassName : kindStyles.chipClassName,
        variant === "section" && "booking-kind-chip--section",
      )}
      style={variant === "section" ? kindAccentStyle(kind) : undefined}
    >
      <Icon
        className={
          compact ? kindStyles.iconSmClassName : kindStyles.iconClassName
        }
        strokeWidth={kindStyles.iconStrokeWidth}
      />
    </div>
  );
}
