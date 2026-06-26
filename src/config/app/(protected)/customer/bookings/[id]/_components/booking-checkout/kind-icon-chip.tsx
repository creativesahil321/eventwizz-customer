import {
  getKindStyles,
  kindAccentStyle,
  CHIP_STYLE,
  CHIP_SECTION_STYLE,
  BADGE_STYLE,
  SECTION_TITLE_STYLE,
  type LineItemKind,
} from "./item-kinds";
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

  const chipStyle =
    variant === "section"
      ? { ...CHIP_SECTION_STYLE, ...kindAccentStyle(kind) }
      : CHIP_STYLE;

  return (
    <div
      className={compact ? kindStyles.chipSmClassName : kindStyles.chipClassName}
      style={chipStyle}
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

export { BADGE_STYLE, SECTION_TITLE_STYLE };
